import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, PackageOpen } from 'lucide-react';
import { api } from '../api.js';
import { useAppStore, useToast } from '../store/app.js';
import SafeImg from '../components/SafeImg.jsx';
import { money, dateFmt, orderNo } from '../format.js';

export default function Orders() {
  const clientId = useAppStore((s) => s.clientId);
  const show = useToast((s) => s.show);
  const placed = useLocation().state?.placed;
  const [state, setState] = useState({ loading: true, error: null, data: [] });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    api.orders(clientId, ctrl.signal).then((r) => setState({ loading: false, error: null, data: r.data })).catch((e) => e.name !== 'AbortError' && setState({ loading: false, error: e.message, data: [] }));
    return () => ctrl.abort();
  }, [clientId, reload]);

  const cancel = async (id) => {
    if (!window.confirm('Cancel this order?')) return;
    try { await api.cancelOrder(id, clientId); show('Order cancelled'); setReload((r) => r + 1); }
    catch (e) { show(e.message, 'error'); }
  };

  return (
    <div className="container-x py-4 md:py-8">
      <h1 className="mb-5 text-2xl font-bold md:text-3xl">My Orders</h1>
      {placed && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-green-50 p-4 text-green-800" role="status">
          <CheckCircle2 /><p><b>Order {orderNo(placed)} placed!</b> Stock has been updated and your items are on the way.</p>
        </div>
      )}
      {state.error && <p className="rounded-xl bg-red-50 p-4 text-red-700" role="alert">{state.error}</p>}
      {state.loading && <div className="space-y-4">{[1, 2].map((n) => <div key={n} className="h-40 animate-pulse rounded-2xl bg-gray-200" />)}</div>}
      {!state.loading && !state.error && state.data.length === 0 && (
        <div className="py-16 text-center"><PackageOpen size={56} className="mx-auto mb-4 text-gray-300" /><p className="text-xl font-bold">No orders yet</p><Link to="/products" className="btn-primary mt-5">Browse products</Link></div>
      )}
      <ul className="space-y-5">
        {state.data.map((o) => (
          <li key={o.id} className={`overflow-hidden rounded-2xl border shadow-sm ${o.id === placed ? 'border-green-300' : 'border-gray-100'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 px-4 py-3 text-sm">
              <div><p className="font-bold">{orderNo(o.id)}</p><p className="text-gray-500">{dateFmt(o.createdAt)} · {o.paymentMethod.toUpperCase()}</p></div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${o.status === 'placed' ? 'bg-brand-100 text-brand-800' : 'bg-red-100 text-red-700'}`}>{o.status}</span>
              <p className="text-lg font-bold">{money(o.total)}</p>
            </div>
            <ul className="divide-y divide-gray-100 px-4">
              {o.items.map((i, n) => (
                <li key={n} className="flex items-center gap-3 py-3">
                  <SafeImg src={i.image} alt={i.name} className="h-16 w-14 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1"><Link to={`/products/${i.productId}`} className="line-clamp-1 font-medium hover:underline">{i.name}</Link><p className="text-sm text-gray-500">Qty {i.qty}{i.size && i.size !== 'Free' ? ` · Size ${i.size}` : ''}</p></div>
                  <p className="font-semibold">{money(i.price * i.qty)}</p>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
              <p>Deliver to: {o.address.name}, {o.address.line1}, {o.address.city} – {o.address.pincode}</p>
              {o.status === 'placed' && <button onClick={() => cancel(o.id)} className="font-semibold text-red-600 hover:underline">Cancel order</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
