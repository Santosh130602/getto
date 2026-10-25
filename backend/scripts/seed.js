import fs from 'node:fs';
import { pool } from '../src/db.js';

const data = JSON.parse(fs.readFileSync(new URL('../data/products.json', import.meta.url), 'utf8'));
const client = await pool.connect();

try {
  console.log('Starting fast seed...');
  await client.query('BEGIN');
  await client.query('TRUNCATE order_items, orders, reviews, products, stores, brands RESTART IDENTITY CASCADE');

  for (const b of data.brands)
    await client.query('INSERT INTO brands (name, logo_url, tagline) VALUES ($1,$2,$3)', [b.name, b.logoUrl, b.tagline]);

  for (const s of data.stores)
    await client.query('INSERT INTO stores (id,name,city,distance_km,rating,banner_url,delivery_minutes) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [s.id, s.name, s.city, s.distanceKm, s.rating, s.bannerUrl, s.deliveryMinutes]);

  await client.query(`SELECT setval(pg_get_serial_sequence('stores','id'), (SELECT MAX(id) FROM stores))`);

  // Insert products in batches
  const CHUNK_SIZE = 50;
  for (let i = 0; i < data.products.length; i += CHUNK_SIZE) {
    const chunk = data.products.slice(i, i + CHUNK_SIZE);
    
    for (const p of chunk) {
      const { rows } = await client.query(
        `INSERT INTO products (sku,name,description,brand,audience,category,price,mrp,rating,review_count,stock,images,sizes,colors,store_id,is_hero,hero_image,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
        [p.sku, p.name, p.description, p.brand, p.audience, p.category, p.price, p.mrp, p.rating, p.reviewCount, p.stock,
          p.images, p.sizes, p.colors, p.storeId, p.isHero, p.heroImage, p.createdAt]);

      const productId = rows[0].id;
      if (p.reviews && p.reviews.length > 0) {
        // Multi-row insert for reviews
        const reviewValues = [];
        const reviewParams = [];
        let pIdx = 1;
        for (const r of p.reviews) {
          reviewValues.push(`($${pIdx}, $${pIdx+1}, $${pIdx+2}, $${pIdx+3}, $${pIdx+4}, $${pIdx+5})`);
          reviewParams.push(productId, r.userName, r.rating, r.title, r.comment, r.createdAt);
          pIdx += 6;
        }
        await client.query(
          `INSERT INTO reviews (product_id, user_name, rating, title, comment, created_at) VALUES ${reviewValues.join(', ')}`,
          reviewParams
        );
      }
    }
    process.stdout.write(`Seeded ${Math.min(i + CHUNK_SIZE, data.products.length)}/${data.products.length} products...\r`);
  }

  await client.query('COMMIT');
  console.log(`\nSuccessfully seeded ${data.products.length} products.`);
} catch (e) {
  await client.query('ROLLBACK');
  console.error(e);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
