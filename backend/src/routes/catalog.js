import { Router } from 'express';
import { query } from '../db.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { idSchema } from '../lib/validation.js';
import { CARD_COLS } from './products.js';

const router = Router();
const AUDIENCES = ['men', 'women', 'kids'];
const audienceOf = (v) => (AUDIENCES.includes(v) ? v : 'men');

const STORE_COLS = `s.id, s.name, s.city, s.distance_km::float AS "distanceKm", s.rating::float AS rating,
  s.banner_url AS "bannerUrl", s.delivery_minutes AS "deliveryMinutes",
  (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id)::int AS "productCount"`;

// GET /api/home?audience=men  -> everything the landing page needs in one call
router.get('/home', asyncHandler(async (req, res) => {
  const a = audienceOf(req.query.audience);
  const [hero, top, fresh, cats, brands, stores] = await Promise.all([
    query(`SELECT ${CARD_COLS}, p.hero_image AS "heroImage", p.description FROM products p
           WHERE p.audience = $1 AND p.is_hero ORDER BY p.rating DESC, p.id LIMIT 5`, [a]),
    query(`SELECT ${CARD_COLS} FROM products p WHERE p.audience = $1 AND p.stock > 0
           ORDER BY p.rating DESC, p.review_count DESC, p.id LIMIT 8`, [a]),
    query(`SELECT ${CARD_COLS} FROM products p WHERE p.audience = $1 AND p.stock > 0
           ORDER BY p.created_at DESC, p.id DESC LIMIT 8`, [a]),
    query(`SELECT category, image, count FROM (
             SELECT DISTINCT ON (category) category, images[1] AS image,
                    COUNT(*) OVER (PARTITION BY category)::int AS count, rating, id
             FROM products WHERE audience = $1 AND stock > 0 ORDER BY category, rating DESC, id) t
           ORDER BY count DESC, category`, [a]),
    query(`SELECT b.name, b.logo_url AS "logoUrl", b.tagline FROM brands b
           WHERE EXISTS (SELECT 1 FROM products p WHERE p.brand = b.name AND p.audience = $1) ORDER BY b.name`, [a]),
    query(`SELECT ${STORE_COLS} FROM stores s ORDER BY s.distance_km LIMIT 4`),
  ]);
  res.json({ audience: a, hero: hero.rows, topProducts: top.rows, newArrivals: fresh.rows, categories: cats.rows, brands: brands.rows, stores: stores.rows });
}));

// GET /api/meta/filters?audience=&storeId=  -> options for the filter panel
router.get('/meta/filters', asyncHandler(async (req, res) => {
  const a = AUDIENCES.includes(req.query.audience) ? req.query.audience : null;
  const s = req.query.storeId ? idSchema.safeParse(req.query.storeId) : null;
  const store = s?.success ? s.data : null;
  const where = `WHERE ($1::text IS NULL OR audience = $1) AND ($2::int IS NULL OR store_id = $2)`;
  const [cats, brands, price] = await Promise.all([
    query(`SELECT category AS name, COUNT(*)::int AS count FROM products ${where} GROUP BY 1 ORDER BY 1`, [a, store]),
    query(`SELECT brand AS name, COUNT(*)::int AS count FROM products ${where} GROUP BY 1 ORDER BY 1`, [a, store]),
    query(`SELECT MIN(price)::float AS min, MAX(price)::float AS max FROM products ${where}`, [a, store]),
  ]);
  res.json({ categories: cats.rows, brands: brands.rows, price: price.rows[0] });
}));

router.get('/stores', asyncHandler(async (_req, res) => {
  const { rows } = await query(`SELECT ${STORE_COLS} FROM stores s ORDER BY s.distance_km`);
  res.json({ data: rows });
}));

router.get('/stores/:id', asyncHandler(async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) throw new AppError(400, 'Invalid store id');
  const { rows } = await query(`SELECT ${STORE_COLS} FROM stores s WHERE s.id = $1`, [id.data]);
  if (!rows[0]) throw new AppError(404, 'Store not found');
  res.json(rows[0]);
}));

export default router;
