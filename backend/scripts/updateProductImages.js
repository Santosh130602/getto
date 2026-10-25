import fs from 'node:fs';
import { pool } from '../src/db.js';

const { products } = JSON.parse(fs.readFileSync(new URL('../data/products.json', import.meta.url), 'utf8'));
const client = await pool.connect();

try {
  await client.query('BEGIN');
  for (const product of products) {
    const result = await client.query(
      'UPDATE products SET images = $1, hero_image = $2 WHERE sku = $3',
      [product.images, product.heroImage, product.sku],
    );
    if (result.rowCount !== 1) {
      throw new Error(`Expected one product for SKU ${product.sku}; updated ${result.rowCount}`);
    }
  }
  await client.query('COMMIT');
  console.log(`Updated images for ${products.length} products.`);
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Product image update failed:', error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
