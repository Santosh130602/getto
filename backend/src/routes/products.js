import { Router } from 'express';
import { query, pool } from '../db.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { searchSchema, idSchema, reviewSchema } from '../lib/validation.js';
import { buildWhere, buildOrder, escapeLike } from '../lib/searchQuery.js';

const router = Router();

const CARD_COLS = `p.id, p.sku, p.name, p.brand, p.audience, p.category, p.price::float AS price, p.mrp::float AS mrp,
  p.rating::float AS rating, p.review_count AS "reviewCount", p.stock, p.images[1] AS image, p.created_at AS "createdAt"`;
export { CARD_COLS };

function parseSearch(req) {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, 'Invalid query parameters', parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })));
  }
  return parsed.data;
}

// GET /api/products
router.get('/', asyncHandler(async (req, res) => {
  const f = parseSearch(req);
  const page = f.page ?? 1;
  const limit = f.limit ?? 20;

  const { whereSql, params } = buildWhere(f);
  const countParams = [...params];
  const dataParams = [...params];
  const { sort, orderSql } = buildOrder(f, dataParams);
  const lim = `$${dataParams.push(limit)}`;
  const off = `$${dataParams.push((page - 1) * limit)}`;

  const [rows, count] = await Promise.all([
    query(`SELECT ${CARD_COLS} FROM products p ${whereSql} ORDER BY ${orderSql} LIMIT ${lim} OFFSET ${off}`, dataParams),
    query(`SELECT COUNT(*)::int AS total FROM products p ${whereSql}`, countParams),
  ]);
  const total = count.rows[0].total;

  // Typo tolerance (bonus): if nothing matched, suggest the closest product/brand name via pg_trgm.
  let didYouMean = null;
  if (total === 0 && f.q && f.q.length >= 3) {
    const s = await query(
      `SELECT term FROM (
         SELECT brand AS term, similarity(brand, $1) AS s FROM products
         UNION ALL SELECT category, similarity(category, $1) FROM products
         UNION ALL SELECT name, word_similarity($1, name) FROM products
       ) t WHERE s > 0.35 ORDER BY s DESC LIMIT 1`, [f.q]);
    didYouMean = s.rows[0]?.term ?? null;
  }

  res.json({
    data: rows.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    sort,
    didYouMean,
  });
}));

// GET /api/products/suggest?q=  (autocomplete)
router.get('/suggest', asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? '').trim().slice(0, 60);
  if (q.length < 2) return res.json({ data: [] });
  const like = `%${escapeLike(q)}%`;
  const prefix = `${escapeLike(q)}%`;
  const { rows } = await query(
    `SELECT id, name, brand, category, images[1] AS image FROM products
     WHERE name ILIKE $1 OR brand ILIKE $1 OR sku ILIKE $1
     ORDER BY (name ILIKE $2) DESC, rating DESC, id LIMIT 6`, [like, prefix]);
  res.json({ data: rows });
}));

// GET /api/products/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) throw new AppError(400, 'Invalid product id');
  const { rows } = await query(
    `SELECT p.id, p.sku, p.name, p.description, p.brand, p.audience, p.category, p.price::float AS price, p.mrp::float AS mrp,
            p.rating::float AS rating, p.review_count AS "reviewCount", p.stock, p.images, p.sizes, p.colors, p.created_at AS "createdAt",
            s.id AS "storeId", s.name AS "storeName", s.delivery_minutes AS "deliveryMinutes"
     FROM products p LEFT JOIN stores s ON s.id = p.store_id WHERE p.id = $1`, [id.data]);
  if (!rows[0]) throw new AppError(404, 'Product not found');

  const [reviews, dist] = await Promise.all([
    query(`SELECT id, user_name AS "userName", rating, title, comment, created_at AS "createdAt"
           FROM reviews WHERE product_id = $1 ORDER BY created_at DESC, id DESC LIMIT 50`, [id.data]),
    query(`SELECT rating, COUNT(*)::int AS count FROM reviews WHERE product_id = $1 GROUP BY rating`, [id.data]),
  ]);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  dist.rows.forEach((r) => { distribution[r.rating] = r.count; });
  res.json({ ...rows[0], reviews: reviews.rows, ratingDistribution: distribution });
}));

// GET /api/products/:id/similar
router.get('/:id/similar', asyncHandler(async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) throw new AppError(400, 'Invalid product id');
  const base = await query('SELECT audience, category FROM products WHERE id = $1', [id.data]);
  if (!base.rows[0]) throw new AppError(404, 'Product not found');
  const { rows } = await query(
    `SELECT ${CARD_COLS} FROM products p
     WHERE p.audience = $1 AND p.id <> $3
     ORDER BY (p.category = $2) DESC, (p.stock > 0) DESC, p.rating DESC, p.id LIMIT 8`,
    [base.rows[0].audience, base.rows[0].category, id.data]);
  res.json({ data: rows });
}));

// POST /api/products/:id/reviews
router.post('/:id/reviews', asyncHandler(async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) throw new AppError(400, 'Invalid product id');
  const body = reviewSchema.safeParse(req.body);
  if (!body.success) throw new AppError(400, 'Invalid review', body.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const exists = await client.query('SELECT 1 FROM products WHERE id = $1', [id.data]);
    if (!exists.rowCount) throw new AppError(404, 'Product not found');
    const r = body.data;
    const ins = await client.query(
      `INSERT INTO reviews (product_id, user_name, rating, title, comment) VALUES ($1,$2,$3,$4,$5)
       RETURNING id, user_name AS "userName", rating, title, comment, created_at AS "createdAt"`,
      [id.data, r.userName, r.rating, r.title || null, r.comment]);
    await client.query(
      `UPDATE products SET
         rating = (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE product_id = $1),
         review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = $1)
       WHERE id = $1`, [id.data]);
    await client.query('COMMIT');
    res.status(201).json(ins.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

export default router;
