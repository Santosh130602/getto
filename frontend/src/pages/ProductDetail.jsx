import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Zap, Store as StoreIcon, Truck, AlertTriangle } from 'lucide-react';
import { api } from '../api.js';
import { useCartStore } from '../store/cart.js';
import { useToast } from '../store/app.js';
import Gallery from '../components/Gallery.jsx';
import StarRating from '../components/StarRating.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { money, discount, dateFmt } from '../format.js';

function Reviews({ product, onAdded }) {
  const show = useToast((s) => s.show);
  const [form, setForm] = useState({ userName: '', rating: 5, title: '', comment: '' });
  const [busy, setBusy] = useState(false);
  const total = Object.values(product.ratingDistribution).reduce((a, b) => a + b, 0);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.addReview(product.id, form);
      show('Thanks for your review!');
      setForm({ userName: '', rating: 5, title: '', comment: '' });
      onAdded();
    } catch (err) {
      show(err.details?.[0]?.message || err.message, 'error');
    } finally { setBusy(false); }
  };

  return (
    <section className="mt-12" id="reviews">
      <h2 className="mb-4 text-xl font-bold md:text-2xl">Customer Reviews</h2>
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <div>
          <div className="flex items-end gap-3"><span className="text-5xl font-bold">{product.rating.toFixed(1)}</span><div><StarRating value={product.rating} showValue={false} /><p className="text-sm text-gray-500">{product.reviewCount} reviews</p></div></div>
          <div className="mt-4 space-y-1.5">
            {[5, 4, 3, 2, 1].map((n) => (
              <div key={n} className="flex items-center gap-2 text-sm">
                <span className="w-8">{n}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${total ? (product.ratingDistribution[n] / total) * 100 : 0}%` }} /></div>
                <span className="w-6 text-right text-gray-500">{product.ratingDistribution[n]}</span>
              </div>
            ))}
          </div>
          <form onSubmit={submit} className="mt-6 space-y-3 rounded-2xl bg-gray-50 p-4">
            <h3 className="font-semibold">Write a review</h3>
            <input className="input" placeholder="Your name" value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} required minLength={2} />
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} onClick={() => setForm({ ...form, rating: n })} aria-label={`${n} stars`} className={`text-3xl leading-none ${n <= form.rating ? 'text-brand-600' : 'text-gray-300'}`}>★</button>
              ))}
            </div>
            <input className="input" placeholder="Title (optional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} />
            <textarea className="input" rows={3} placeholder="Share your experience" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} required minLength={3} />
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Submitting…' : 'Submit review'}</button>
          </form>
        </div>
        <ul className="space-y-4">
          {product.reviews.length === 0 && <li className="text-gray-500">No reviews yet. Be the first!</li>}
          {product.reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800">{r.userName[0]}</span>
                  <div><p className="font-semibold leading-tight">{r.userName}</p><p className="text-xs text-gray-500">{dateFmt(r.createdAt)} · Verified buyer</p></div>
                </div>
                <StarRating value={r.rating} showValue={false} size={14} />
              </div>
              {r.title && <p className="mt-3 font-semibold">{r.title}</p>}
              <p className="mt-1 text-gray-700">{r.comment}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const add = useCartStore((s) => s.add);
  const show = useToast((s) => s.show);
  const [state, setState] = useState({ loading: true, error: null, product: null });
  const [similar, setSimilar] = useState([]);
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    api.product(id, ctrl.signal)
      .then((product) => { setState({ loading: false, error: null, product }); if (product.sizes.length === 1) setSize(product.sizes[0]); })
      .catch((e) => e.name !== 'AbortError' && setState({ loading: false, error: e.message, product: null }));
    return () => ctrl.abort();
  }, [id, reload]);

  useEffect(() => {
    setSize(''); setQty(1); setSimilar([]);
    const ctrl = new AbortController();
    api.similar(id, ctrl.signal).then((r) => setSimilar(r.data)).catch(() => {});
    return () => ctrl.abort();
  }, [id]);

  const { product: p, loading, error } = state;
  if (error) return <div className="container-x py-20 text-center"><AlertTriangle className="mx-auto mb-3 text-red-500" size={44} /><p className="text-lg font-semibold">{error}</p><Link to="/products" className="btn-primary mt-5">Back to shop</Link></div>;
  if (loading && !p) return <div className="container-x grid gap-8 py-8 md:grid-cols-2"><div className="aspect-[4/5] animate-pulse rounded-3xl bg-gray-200" /><div className="space-y-4"><div className="h-6 w-1/3 animate-pulse rounded bg-gray-200" /><div className="h-10 animate-pulse rounded bg-gray-200" /><div className="h-24 animate-pulse rounded bg-gray-200" /></div></div>;
  if (!p) return null;

  const out = p.stock === 0;
  const cap = Math.min(10, p.stock);
  const off = discount(p.price, p.mrp);
  const needsSize = !(p.sizes.length === 1 && p.sizes[0] === 'Free');

  const addToCart = () => {
    if (needsSize && !size) { show('Please select a size', 'error'); return false; }
    add(p, size || p.sizes[0], qty);
    return true;
  };

  return (
    <div className="container-x py-4 md:py-8">
      <nav className="mb-4 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link to="/" className="hover:underline">Home</Link> / <Link to={`/products?audience=${p.audience}`} className="capitalize hover:underline">{p.audience}</Link> / <Link to={`/products?audience=${p.audience}&category=${encodeURIComponent(p.category)}`} className="hover:underline">{p.category}</Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <div className="md:sticky md:top-20 md:self-start"><Gallery images={p.images} alt={p.name} /></div>

        <div>
          <Link to={`/products?brand=${encodeURIComponent(p.brand)}`} className="text-sm font-semibold uppercase tracking-wide text-brand-700 hover:underline">{p.brand}</Link>
          <h1 className="mt-1 text-2xl font-bold leading-snug md:text-3xl">{p.name}</h1>
          <a href="#reviews" className="mt-2 inline-block"><StarRating value={p.rating} count={p.reviewCount} /></a>

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold">{money(p.price)}</span>
            {off > 0 && <><span className="text-lg text-gray-400 line-through">{money(p.mrp)}</span><span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-sm font-bold text-brand-800">{off}% OFF</span></>}
          </div>
          <p className="text-xs text-gray-500">Inclusive of all taxes · SKU {p.sku}</p>

          <p className={`mt-3 font-semibold ${out ? 'text-red-600' : p.stock <= 5 ? 'text-orange-600' : 'text-green-700'}`}>
            {out ? 'Out of stock' : p.stock <= 5 ? `Hurry! Only ${p.stock} left` : 'In stock'}
          </p>

          {p.colors.length > 0 && <p className="mt-4 text-sm"><b>Colours:</b> {p.colors.join(' · ')}</p>}

          {needsSize && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-bold">Select size</p>
              <div className="flex flex-wrap gap-2">
                {p.sizes.map((s) => (
                  <button key={s} onClick={() => setSize(s)} aria-pressed={size === s}
                    className={`min-w-12 rounded-xl border-2 px-4 py-2 font-semibold transition ${size === s ? 'border-brand-700 bg-brand-50 text-brand-800' : 'border-gray-200 hover:border-gray-400'}`}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {!out && (
            <div className="mt-5 flex items-center gap-4">
              <span className="text-sm font-bold">Qty</span>
              <div className="flex items-center rounded-xl border border-gray-300">
                <button className="p-3 disabled:opacity-30" disabled={qty <= 1} onClick={() => setQty(qty - 1)} aria-label="Decrease"><Minus size={16} /></button>
                <span className="w-8 text-center font-semibold">{qty}</span>
                <button className="p-3 disabled:opacity-30" disabled={qty >= cap} onClick={() => setQty(qty + 1)} aria-label="Increase"><Plus size={16} /></button>
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button className="btn-outline" disabled={out} onClick={() => addToCart() && show('Added to cart')}><ShoppingCart size={20} />Add to cart</button>
            <button className="btn-primary" disabled={out} onClick={() => addToCart() && navigate('/checkout')}><Zap size={20} />Buy now</button>
          </div>

          <div className="mt-6 space-y-3 rounded-2xl bg-gray-50 p-4 text-sm">
            <p className="flex items-center gap-2"><Truck size={18} className="text-brand-700" />Delivery in ~{p.deliveryMinutes ?? 60} mins · Free over ₹999</p>
            {p.storeId && <p className="flex items-center gap-2"><StoreIcon size={18} className="text-brand-700" />Sold by <Link className="font-semibold text-brand-700 hover:underline" to={`/stores/${p.storeId}`}>{p.storeName}</Link></p>}
          </div>

          <div className="mt-6">
            <h2 className="mb-1 font-bold">Product details</h2>
            <p className="text-gray-700">{p.description}</p>
            <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-gray-500">Brand</dt><dd>{p.brand}</dd>
              <dt className="text-gray-500">Category</dt><dd className="capitalize">{p.audience} · {p.category}</dd>
              <dt className="text-gray-500">Listed on</dt><dd>{dateFmt(p.createdAt)}</dd>
            </dl>
          </div>
        </div>
      </div>

      <Reviews product={p} onAdded={() => setReload((r) => r + 1)} />

      {similar.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold md:text-2xl">Similar Products</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">{similar.slice(0, 8).map((s) => <ProductCard key={s.id} product={s} />)}</div>
        </section>
      )}
    </div>
  );
}
