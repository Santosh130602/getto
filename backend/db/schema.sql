-- WARNING: destructive. Recreates every table.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP TABLE IF EXISTS order_items, orders, reviews, products, stores, brands CASCADE;

CREATE TABLE brands (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(80) UNIQUE NOT NULL,
  logo_url  TEXT,
  tagline   VARCHAR(160)
);

CREATE TABLE stores (
  id                SERIAL PRIMARY KEY,
  name              VARCHAR(120) NOT NULL,
  city              VARCHAR(60) NOT NULL,
  distance_km       NUMERIC(4,1) NOT NULL,
  rating            NUMERIC(2,1) NOT NULL CHECK (rating BETWEEN 0 AND 5),
  banner_url        TEXT,
  delivery_minutes  INT NOT NULL DEFAULT 60
);

CREATE TABLE products (
  id            SERIAL PRIMARY KEY,
  sku           VARCHAR(40) UNIQUE NOT NULL,
  name          VARCHAR(200) NOT NULL,
  description   TEXT NOT NULL,
  brand         VARCHAR(80) NOT NULL,
  audience      VARCHAR(10) NOT NULL CHECK (audience IN ('men','women','kids')),
  category      VARCHAR(60) NOT NULL,
  price         NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  mrp           NUMERIC(10,2) NOT NULL CHECK (mrp >= 0),
  rating        NUMERIC(2,1) NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  review_count  INT NOT NULL DEFAULT 0,
  stock         INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  images        TEXT[] NOT NULL DEFAULT '{}',
  sizes         TEXT[] NOT NULL DEFAULT '{}',
  colors        TEXT[] NOT NULL DEFAULT '{}',
  store_id      INT REFERENCES stores(id),
  is_hero       BOOLEAN NOT NULL DEFAULT FALSE,
  hero_image    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Filter / sort indexes
CREATE INDEX idx_products_audience_category ON products (audience, category);
CREATE INDEX idx_products_brand      ON products (brand);
CREATE INDEX idx_products_price      ON products (price, id);
CREATE INDEX idx_products_rating     ON products (rating DESC, id);
CREATE INDEX idx_products_created    ON products (created_at DESC, id DESC);
CREATE INDEX idx_products_store      ON products (store_id);
CREATE INDEX idx_products_in_stock   ON products (id) WHERE stock > 0;
CREATE INDEX idx_products_hero       ON products (audience) WHERE is_hero;

-- Partial-text (ILIKE '%term%') search indexes
CREATE INDEX idx_products_name_trgm  ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_desc_trgm  ON products USING gin (description gin_trgm_ops);
CREATE INDEX idx_products_brand_trgm ON products USING gin (brand gin_trgm_ops);
CREATE INDEX idx_products_cat_trgm   ON products USING gin (category gin_trgm_ops);
CREATE INDEX idx_products_sku_trgm   ON products USING gin (sku gin_trgm_ops);

CREATE TABLE reviews (
  id          SERIAL PRIMARY KEY,
  product_id  INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_name   VARCHAR(60) NOT NULL,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       VARCHAR(120),
  comment     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_product ON reviews (product_id, created_at DESC);

CREATE TABLE orders (
  id              SERIAL PRIMARY KEY,
  client_id       UUID NOT NULL,
  total           NUMERIC(12,2) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'placed' CHECK (status IN ('placed','cancelled')),
  payment_method  VARCHAR(20) NOT NULL DEFAULT 'cod',
  address         JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_client ON orders (client_id, created_at DESC);

CREATE TABLE order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES products(id),
  name        VARCHAR(200) NOT NULL,
  image       TEXT,
  price       NUMERIC(10,2) NOT NULL,
  qty         INT NOT NULL CHECK (qty > 0),
  size        VARCHAR(10)
);
CREATE INDEX idx_order_items_order ON order_items (order_id);
