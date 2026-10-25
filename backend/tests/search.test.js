// Integration tests: require a seeded database (npm run db:setup) and DATABASE_URL in .env.
import { test, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import app from '../src/app.js';
import { pool } from '../src/db.js';

after(() => pool.end());

const search = (params = {}) => request(app).get('/api/products').query(params);
const first = async () => (await search({ limit: 50 })).body.data;

describe('keyword search', () => {
  test('full product-name search', async () => {
    const p = (await first())[0];
    const res = await search({ q: p.name });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.some((x) => x.id === p.id));
  });

  test('partial product-name search', async () => {
    const p = (await first())[0];
    const res = await search({ q: p.name.slice(2, 9) });
    assert.ok(res.body.data.length > 0);
  });

  test('search by brand', async () => {
    const p = (await first())[0];
    const res = await search({ q: p.brand, limit: 100 });
    assert.ok(res.body.data.length > 0);
  });

  test('search by category', async () => {
    const res = await search({ q: 'hoodies', limit: 100 });
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.every((x) => /hoodie/i.test(x.name + x.category)));
  });

  test('search by SKU (exact SKU ranks first)', async () => {
    const p = (await first())[0];
    const res = await search({ q: p.sku });
    assert.equal(res.body.data[0].id, p.id);
  });

  test('case-insensitive', async () => {
    const a = await search({ q: 'DENIM', limit: 100 });
    const b = await search({ q: 'denim', limit: 100 });
    assert.ok(a.body.pagination.total > 0);
    assert.equal(a.body.pagination.total, b.body.pagination.total);
  });

  test('multi-word query requires every word', async () => {
    const all = await search({ q: 'cotton', limit: 100 });
    const narrowed = await search({ q: 'cotton hoodie', limit: 100 });
    assert.ok(narrowed.body.pagination.total <= all.body.pagination.total);
  });

  test('LIKE wildcards in input are treated literally', async () => {
    const res = await search({ q: '%' });
    assert.equal(res.status, 200);
    assert.equal(res.body.pagination.total, 0);
  });
});

describe('filters, sorting, pagination', () => {
  test('combined filters all apply together', async () => {
    const res = await search({ audience: 'men', minPrice: 500, maxPrice: 1500, minRating: 3, inStock: 'true', limit: 100 });
    assert.equal(res.status, 200);
    for (const p of res.body.data) {
      assert.equal(p.audience, 'men');
      assert.ok(p.price >= 500 && p.price <= 1500);
      assert.ok(p.rating >= 3);
      assert.ok(p.stock > 0);
    }
  });

  test('multi-select category + brand filters', async () => {
    const p = (await first())[0];
    const res = await search({ category: p.category, brand: p.brand, limit: 100 });
    assert.ok(res.body.data.length >= 1);
    assert.ok(res.body.data.every((x) => x.category === p.category && x.brand === p.brand));
  });

  test('price range + price_asc sorting', async () => {
    const res = await search({ minPrice: 300, maxPrice: 2000, sort: 'price_asc', limit: 100 });
    const prices = res.body.data.map((x) => x.price);
    assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  });

  test('price_desc, rating, newest, name sorting', async () => {
    const d = (await search({ sort: 'price_desc', limit: 100 })).body.data.map((x) => x.price);
    assert.deepEqual(d, [...d].sort((a, b) => b - a));
    const r = (await search({ sort: 'rating', limit: 100 })).body.data.map((x) => x.rating);
    assert.deepEqual(r, [...r].sort((a, b) => b - a));
    const n = (await search({ sort: 'newest', limit: 100 })).body.data.map((x) => +new Date(x.createdAt));
    assert.deepEqual(n, [...n].sort((a, b) => b - a));
    const a = (await search({ sort: 'name', limit: 100 })).body.data.map((x) => x.name.toLowerCase());
    assert.deepEqual(a, [...a].sort());
  });

  test('default page size is 20 and pagination keeps criteria', async () => {
    const p1 = await search({ audience: 'women', sort: 'price_asc', page: 1 });
    const p2 = await search({ audience: 'women', sort: 'price_asc', page: 2 });
    assert.equal(p1.body.data.length, 20);
    assert.equal(p1.body.pagination.total, p2.body.pagination.total);
    assert.ok(p2.body.data.every((x) => x.audience === 'women'));
    const ids1 = new Set(p1.body.data.map((x) => x.id));
    assert.ok(p2.body.data.every((x) => !ids1.has(x.id)), 'pages must not overlap');
  });

  test('stable pagination when sort values are equal (price ties)', async () => {
    const seen = [];
    for (let page = 1; page <= 6; page++) {
      const r = await search({ sort: 'price_asc', limit: 25, page });
      seen.push(...r.body.data);
    }
    assert.equal(new Set(seen.map((x) => x.id)).size, seen.length, 'no duplicates or gaps across pages');
    for (let i = 1; i < seen.length; i++) {
      const a = seen[i - 1], b = seen[i];
      assert.ok(a.price < b.price || (a.price === b.price && a.id < b.id), 'ordered by (price, id)');
    }
  });

  test('empty results', async () => {
    const res = await search({ q: 'zzzzqqqq-nothing' });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, []);
    assert.equal(res.body.pagination.total, 0);
  });

  test('clearing filters returns the full catalogue (>= 500)', async () => {
    const res = await search({});
    assert.ok(res.body.pagination.total >= 500);
  });
});

describe('validation & security', () => {
  test('negative price -> 400', async () => {
    const res = await search({ minPrice: -5 });
    assert.equal(res.status, 400);
  });

  test('min > max price -> 400', async () => {
    const res = await search({ minPrice: 900, maxPrice: 100 });
    assert.equal(res.status, 400);
  });

  test('bad sort / page / limit / rating -> 400', async () => {
    assert.equal((await search({ sort: 'price; DROP TABLE products' })).status, 400);
    assert.equal((await search({ page: 0 })).status, 400);
    assert.equal((await search({ limit: 1000 })).status, 400);
    assert.equal((await search({ minRating: 9 })).status, 400);
    assert.equal((await search({ minPrice: 'abc' })).status, 400);
  });

  test('SQL injection attempts are inert', async () => {
    const attacks = ["'; DROP TABLE products; --", "' OR '1'='1", "x') UNION SELECT 1,2,3--", '"; DELETE FROM products; --'];
    for (const q of attacks) {
      for (const field of ['q', 'brand', 'category']) {
        const res = await search({ [field]: q });
        assert.equal(res.status, 200, `${field}=${q}`);
        assert.equal(res.body.pagination.total, 0);
      }
    }
    const still = await search({});
    assert.ok(still.body.pagination.total >= 500, 'table intact');
  });
});

describe('product detail, similar, meta', () => {
  test('detail includes images, reviews and distribution', async () => {
    const p = (await first())[0];
    const res = await request(app).get(`/api/products/${p.id}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.images.length >= 2);
    assert.ok(Array.isArray(res.body.reviews));
    assert.ok(res.body.ratingDistribution);
    assert.equal((await request(app).get('/api/products/99999999')).status, 404);
    assert.equal((await request(app).get('/api/products/abc')).status, 400);
  });

  test('similar products exclude the product itself', async () => {
    const p = (await first())[0];
    const res = await request(app).get(`/api/products/${p.id}/similar`);
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.every((x) => x.id !== p.id));
  });

  test('home payload is audience specific', async () => {
    const res = await request(app).get('/api/home').query({ audience: 'kids' });
    assert.equal(res.body.audience, 'kids');
    assert.ok(res.body.hero.every((x) => x.audience === 'kids'));
    assert.ok(res.body.categories.length > 0);
  });
});

describe('orders reduce stock', () => {
  const address = { name: 'Test User', phone: '9876543210', line1: '12 Test Street', city: 'Hyderabad', pincode: '500001' };

  test('placing an order decrements stock; cancelling restores it; oversell is rejected', async () => {
    const p = (await search({ inStock: 'true', limit: 1 })).body.data[0];
    const before = (await request(app).get(`/api/products/${p.id}`)).body.stock;
    const clientId = randomUUID();

    const ok = await request(app).post('/api/orders').send({ clientId, items: [{ productId: p.id, qty: 2, size: 'M' }], address });
    assert.equal(ok.status, 201);
    const after = (await request(app).get(`/api/products/${p.id}`)).body.stock;
    assert.equal(after, before - 2);

    const list = await request(app).get('/api/orders').query({ clientId });
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.data[0].items[0].qty, 2);

    const tooMany = await request(app).post('/api/orders').send({ clientId, items: [{ productId: p.id, qty: 10 }, { productId: p.id, qty: 10 }, { productId: p.id, qty: 10 }, { productId: p.id, qty: 10 }, { productId: p.id, qty: 10 }, { productId: p.id, qty: 10 }], address });
    assert.equal(tooMany.status, 409);
    assert.equal((await request(app).get(`/api/products/${p.id}`)).body.stock, after, 'failed order rolls back');

    const cancel = await request(app).post(`/api/orders/${ok.body.id}/cancel`).send({ clientId });
    assert.equal(cancel.status, 200);
    assert.equal((await request(app).get(`/api/products/${p.id}`)).body.stock, before);
  });

  test('invalid order payload -> 400', async () => {
    const res = await request(app).post('/api/orders').send({ clientId: 'nope', items: [], address: {} });
    assert.equal(res.status, 400);
  });
});
