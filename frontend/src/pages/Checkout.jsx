import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Banknote } from 'lucide-react';
import { api } from '../api.js';
import { useCartStore } from '../store/cart.js';
import { useAppStore, useToast } from '../store/app.js';
import { Summary } from './Cart.jsx';
import SafeImg from '../components/SafeImg.jsx';

const validate = (f) => {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Enter your full name';
  if (!/^[6-9]\d{9}$/.test(f.phone)) e.phone = 'Enter a valid 10-digit mobile number';
  if (f.line1.trim().length < 5) e.line1 = 'Enter your full address';
  if (f.city.trim().length < 2) e.city = 'Enter your city';
  if (!/^\d{6}$/.test(f.pincode)) e.pincode = 'Pincode must be 6 digits';
  return e;
};

function Field({ label, error, children }) {
  return <label className="block"><span className="mb-1 block text-sm font-semibold">{label}</span>{children}{error && <span className="mt-1 block text-sm text-red-600">{error}</span>}</label>;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { items, clear } = useCartStore();
  const clientId = useAppStore((s) => s.clientId);
  const show = useToast((s) => s.show);
  const [f, setF] = useState({ name: '', phone: '', line1: '', city: 'Hyderabad', pincode: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!items.length && !busy) return <Navigate to="/cart" replace />;
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const savings = items.reduce((n, i) => n + Math.max(0, i.mrp - i.price) * i.qty, 0);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const v = validate(f);
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true); setServerError('');
    try {
      const order = await api.placeOrder({
        clientId,
        items: items.map((i) => ({ productId: i.id, qty: i.qty, size: i.size })),
        address: { ...f, name: f.name.trim(), line1: f.line1.trim(), city: f.city.trim() },
        paymentMethod: 'cod',
      });
      clear();
      show('Order placed successfully 🎉');
      navigate('/orders', { replace: true, state: { placed: order.id } });
    } catch (err) {
      setServerError(err.details?.[0]?.message || err.message);
      show(err.message, 'error');
      setBusy(false);
    }
  };

  return (
    <div className="container-x py-4 md:py-8">
      <h1 className="mb-5 text-2xl font-bold md:text-3xl">Checkout</h1>
      <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold">Delivery address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={errors.name}><input className="input" value={f.name} onChange={set('name')} autoComplete="name" /></Field>
              <Field label="Mobile number" error={errors.phone}><input className="input" value={f.phone} onChange={set('phone')} inputMode="numeric" maxLength={10} autoComplete="tel" /></Field>
              <div className="sm:col-span-2"><Field label="Address" error={errors.line1}><input className="input" value={f.line1} onChange={set('line1')} autoComplete="street-address" /></Field></div>
              <Field label="City" error={errors.city}><input className="input" value={f.city} onChange={set('city')} /></Field>
              <Field label="Pincode" error={errors.pincode}><input className="input" value={f.pincode} onChange={set('pincode')} inputMode="numeric" maxLength={6} /></Field>
            </div>
          </section>
          <section className="rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold">Payment</h2>
            <label className="flex items-center gap-3 rounded-xl border-2 border-brand-700 bg-brand-50 p-4"><input type="radio" checked readOnly className="h-5 w-5 accent-brand-700" /><Banknote className="text-brand-700" /><span className="font-semibold">Cash on delivery</span></label>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-gray-100 bg-gray-50 p-5 lg:sticky lg:top-20">
          <h2 className="mb-3 text-lg font-bold">Your items</h2>
          <ul className="mb-4 max-h-60 space-y-3 overflow-y-auto">
            {items.map((i) => (
              <li key={i.key} className="flex items-center gap-3 text-sm">
                <SafeImg src={i.image} alt="" className="h-14 w-12 rounded-lg object-cover" />
                <span className="line-clamp-2 flex-1">{i.name}{i.size && i.size !== 'Free' ? ` · ${i.size}` : ''}</span><span className="font-semibold">×{i.qty}</span>
              </li>
            ))}
          </ul>
          <Summary subtotal={subtotal} savings={savings} />
          {serverError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{serverError}</p>}
          <button className="btn-primary mt-5 w-full" disabled={busy}>{busy ? 'Placing order…' : 'Place order'}</button>
          <Link to="/cart" className="mt-3 block text-center text-sm font-semibold text-brand-700">Back to cart</Link>
        </aside>
      </form>
    </div>
  );
}
