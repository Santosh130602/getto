import { Router } from 'express';
import { z } from 'zod';
import { query, pool } from '../db.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { orderSchema, idSchema } from '../lib/validation.js';

const router = Router();
const clientIdSchema = z.string().uuid();

const ORDER_SELECT = `
  SELECT o.id, o.total::float AS total, o.status, o.payment_method AS "paymentMethod", o.address, o.created_at AS "createdAt",
    COALESCE(json_agg(json_build_object('productId', oi.product_id, 'name', oi.name, 'image', oi.image,
      'price', oi.price::float, 'qty', oi.qty, 'size', oi.size) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
  FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id`;

// POST /api/orders  — atomic: stock is decremented in the same transaction the order is created.
router.post('/', asyncHandler(async (req, res) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'Invalid order', parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })));
  const { clientId, items, address, paymentMethod } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lines = [...items].sort((a, b) => a.productId - b.productId); // consistent lock order => no deadlocks
    const saved = [];
    let total = 0;
    for (const l of lines) {
      // Conditional UPDATE: succeeds only if enough stock remains (race-safe, no overselling).
      const r = await client.query(
        `UPDATE products SET stock = stock - $2 WHERE id = $1 AND stock >= $2
         RETURNING id, name, price::float AS price, images[1] AS image`, [l.productId, l.qty]);
      if (!r.rowCount) {
        const ex = await client.query('SELECT name, stock FROM products WHERE id = $1', [l.productId]);
        if (!ex.rowCount) throw new AppError(404, `Product ${l.productId} not found`);
        throw new AppError(409, ex.rows[0].stock === 0
          ? `"${ex.rows[0].name}" is out of stock`
          : `Only ${ex.rows[0].stock} left for "${ex.rows[0].name}"`);
      }
      total += r.rows[0].price * l.qty;
      saved.push({ ...r.rows[0], qty: l.qty, size: l.size ?? null });
    }
    const delivery = total >= 999 ? 0 : 49; // keep in sync with the frontend Summary
    total = Math.round((total + delivery) * 100) / 100;
    const o = await client.query(
      `INSERT INTO orders (client_id, total, payment_method, address) VALUES ($1,$2,$3,$4) RETURNING id`,
      [clientId, total, paymentMethod, JSON.stringify(address)]);
    for (const s of saved) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, name, image, price, qty, size) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [o.rows[0].id, s.id, s.name, s.image, s.price, s.qty, s.size]);
    }
    await client.query('COMMIT');
    res.status(201).json({ id: o.rows[0].id, total, status: 'placed' });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

// GET /api/orders?clientId=<uuid>
router.get('/', asyncHandler(async (req, res) => {
  const c = clientIdSchema.safeParse(req.query.clientId);
  if (!c.success) throw new AppError(400, 'clientId (uuid) is required');
  const { rows } = await query(`${ORDER_SELECT} WHERE o.client_id = $1 GROUP BY o.id ORDER BY o.created_at DESC, o.id DESC`, [c.data]);
  res.json({ data: rows });
}));

// POST /api/orders/:id/cancel  { clientId } — restores stock
router.post('/:id/cancel', asyncHandler(async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  const c = clientIdSchema.safeParse(req.body?.clientId);
  if (!id.success || !c.success) throw new AppError(400, 'Invalid order id or clientId');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const o = await client.query(`UPDATE orders SET status = 'cancelled' WHERE id = $1 AND client_id = $2 AND status = 'placed' RETURNING id`, [id.data, c.data]);
    if (!o.rowCount) throw new AppError(404, 'Order not found or already cancelled');
    await client.query(
      `UPDATE products p SET stock = p.stock + oi.qty FROM order_items oi WHERE oi.order_id = $1 AND oi.product_id = p.id`, [id.data]);
    await client.query('COMMIT');
    res.json({ id: id.data, status: 'cancelled' });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

export default router;
