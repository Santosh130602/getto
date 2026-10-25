// Builds a fully parameterised search query. User input is NEVER concatenated into SQL:
// values go through $n placeholders, and ORDER BY comes from a fixed whitelist.
const ORDER = {
  price_asc: 'p.price ASC, p.id ASC',
  price_desc: 'p.price DESC, p.id ASC',
  rating: 'p.rating DESC, p.review_count DESC, p.id ASC',
  newest: 'p.created_at DESC, p.id DESC',
  name: 'LOWER(p.name) ASC, p.id ASC', // id is always the final tie-breaker => stable pagination
};

export const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

export function buildWhere(f) {
  const where = [];
  const params = [];
  const add = (v) => { params.push(v); return `$${params.length}`; };

  if (f.q) {
    const tokens = [...new Set(f.q.toLowerCase().split(/\s+/).filter(Boolean))].slice(0, 6);
    for (const t of tokens) {
      const p = add(`%${escapeLike(t)}%`);
      where.push(`(p.name ILIKE ${p} OR p.description ILIKE ${p} OR p.brand ILIKE ${p} OR p.category ILIKE ${p} OR p.audience ILIKE ${p} OR p.sku ILIKE ${p})`);
    }
  }
  if (f.audience) where.push(`p.audience = ${add(f.audience)}`);
  if (f.category?.length) where.push(`p.category = ANY(${add(f.category)}::text[])`);
  if (f.brand?.length) where.push(`p.brand = ANY(${add(f.brand)}::text[])`);
  if (f.storeId) where.push(`p.store_id = ${add(f.storeId)}`);
  if (f.minPrice != null) where.push(`p.price >= ${add(f.minPrice)}`);
  if (f.maxPrice != null) where.push(`p.price <= ${add(f.maxPrice)}`);
  if (f.minRating != null) where.push(`p.rating >= ${add(f.minRating)}`);
  if (f.inStock) where.push('p.stock > 0');

  return { whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

export function buildOrder(f, params) {
  const sort = f.sort || (f.q ? 'relevance' : 'newest');
  if (sort === 'relevance' && f.q) {
    const exact = `$${params.push(f.q.toLowerCase())}`;
    const prefix = `$${params.push(`${escapeLike(f.q)}%`)}`;
    const phrase = `$${params.push(`%${escapeLike(f.q)}%`)}`;
    const score = `(CASE WHEN LOWER(p.sku) = ${exact} THEN 100 ELSE 0 END
      + CASE WHEN p.name ILIKE ${prefix} THEN 40 ELSE 0 END
      + CASE WHEN p.name ILIKE ${phrase} THEN 30 ELSE 0 END
      + CASE WHEN p.brand ILIKE ${phrase} THEN 15 ELSE 0 END
      + CASE WHEN p.category ILIKE ${phrase} THEN 10 ELSE 0 END)`;
    return { sort, orderSql: `${score} DESC, p.rating DESC, p.id ASC` };
  }
  return { sort, orderSql: ORDER[sort] || ORDER.newest };
}
