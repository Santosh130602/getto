import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/cart.js';
import SafeImg from '../components/SafeImg.jsx';
import { money } from '../format.js';

export const DELIVERY_FREE_ABOVE = 999;
export const DELIVERY_FEE = 49;

export function Summary({ subtotal, savings }) {
  const delivery = subtotal === 0 || subtotal >= DELIVERY_FREE_ABOVE ? 0 : DELIVERY_FEE;
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{money(subtotal)}</span></div>
      {savings > 0 && <div className="flex justify-between text-green-700"><span>You save</span><span>− {money(savings)}</span></div>}
      <div className="flex justify-between"><span className="text-gray-600">Delivery</span><span>{delivery ? money(delivery) : 'FREE'}</span></div>
      <div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-bold"><span>Total</span><span>{money(subtotal + delivery)}</span></div>
    </div>
  );
}

export default function Cart() {
  const navigate = useNavigate();
  const { items, setQty, remove } = useCartStore();
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const savings = items.reduce((n, i) => n + Math.max(0, i.mrp - i.price) * i.qty, 0);

  if (!items.length) {
    return (
      <div className="container-x py-20 text-center">
        <ShoppingBag size={56} className="mx-auto mb-4 text-gray-300" />
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-1 text-gray-500">Looks like you haven't added anything yet.</p>
        <Link to="/products" className="btn-primary mt-6">Start shopping</Link>
      </div>
    );
  }
  return (
    <div className="container-x py-4 md:py-8">
      <h1 className="mb-5 text-2xl font-bold md:text-3xl">My Cart <span className="text-lg font-medium text-gray-500">({items.length} item{items.length > 1 ? 's' : ''})</span></h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <ul className="space-y-4">
          {items.map((i) => (
            <li key={i.key} className="flex gap-4 rounded-2xl border border-gray-100 p-3 shadow-sm">
              <Link to={`/products/${i.id}`}><SafeImg src={i.image} alt={i.name} className="h-28 w-24 rounded-xl object-cover" /></Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-xs font-semibold uppercase text-brand-700">{i.brand}</p>
                <Link to={`/products/${i.id}`} className="line-clamp-2 font-medium">{i.name}</Link>
                {i.size && i.size !== 'Free' && <p className="text-sm text-gray-500">Size: {i.size}</p>}
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="flex items-center rounded-xl border border-gray-300">
                    <button className="p-2 disabled:opacity-30" disabled={i.qty <= 1} onClick={() => setQty(i.key, i.qty - 1)} aria-label="Decrease quantity"><Minus size={16} /></button>
                    <span className="w-7 text-center font-semibold">{i.qty}</span>
                    <button className="p-2 disabled:opacity-30" disabled={i.qty >= Math.min(10, i.stock)} onClick={() => setQty(i.key, i.qty + 1)} aria-label="Increase quantity"><Plus size={16} /></button>
                  </div>
                  <p className="font-bold">{money(i.price * i.qty)}</p>
                </div>
              </div>
              <button className="self-start p-1 text-gray-400 hover:text-red-600" onClick={() => remove(i.key)} aria-label="Remove item"><Trash2 size={20} /></button>
            </li>
          ))}
        </ul>
        <aside className="h-fit rounded-2xl border border-gray-100 bg-gray-50 p-5 lg:sticky lg:top-20">
          <h2 className="mb-3 text-lg font-bold">Order summary</h2>
          <Summary subtotal={subtotal} savings={savings} />
          <button className="btn-primary mt-5 w-full" onClick={() => navigate('/checkout')}>Proceed to checkout</button>
        </aside>
      </div>
    </div>
  );
}
