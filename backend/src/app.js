import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import productRoutes from './routes/products.js';
import catalogRoutes from './routes/catalog.js';
import orderRoutes from './routes/orders.js';

const app = express();
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'https://getto-ruby.vercel.app' || 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', catalogRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message, details: err.details });
});

export default app;
