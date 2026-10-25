import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Clock, Star } from 'lucide-react';
import { api } from '../api.js';
import SafeImg from '../components/SafeImg.jsx';
import StarRating from '../components/StarRating.jsx';

export default function Stores() {
  const [state, setState] = useState({ loading: true, error: null, data: [] });
  useEffect(() => {
    const ctrl = new AbortController();
    api.stores(ctrl.signal).then((r) => setState({ loading: false, error: null, data: r.data })).catch((e) => e.name !== 'AbortError' && setState({ loading: false, error: e.message, data: [] }));
    return () => ctrl.abort();
  }, []);
  return (
    <div className="container-x py-4 md:py-8">
      <h1 className="mb-5 text-2xl font-extrabold uppercase tracking-tight md:text-3xl">Nearby Stores</h1>
      {state.error && <p className="rounded-xl bg-red-50 p-4 text-red-700" role="alert">{state.error}</p>}
      {state.loading && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((n) => <div key={n} className="h-72 animate-pulse rounded-2xl bg-gray-200" />)}</div>}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {state.data.map((s) => (
          <Link key={s.id} to={`/stores/${s.id}`} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-lg">
            <SafeImg src={s.bannerUrl} alt={s.name} className="h-48 w-full object-cover transition duration-300 group-hover:scale-105" />
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="flex flex-wrap items-center gap-2 font-bold">{s.name}<span className="text-sm font-normal text-gray-400">|</span><span className="text-sm font-normal text-gray-600">~{s.distanceKm} km</span><span className="text-sm font-normal text-gray-400">|</span><span className="inline-flex items-center gap-1 text-sm font-semibold text-red-700"><Clock size={14} />{s.deliveryMinutes} min</span></p>
                <div className="mt-1 flex items-center gap-2"><StarRating value={s.rating} size={16} /><span className="text-sm text-gray-500">· {s.productCount} products</span></div>
              </div>
              <ChevronRight className="text-brand-700" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
