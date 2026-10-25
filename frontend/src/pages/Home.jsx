import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Star } from 'lucide-react';
import { api } from '../api.js';
import { useAppStore } from '../store/app.js';
import { AudienceTabs } from '../components/Layout.jsx';
import ProductCard, { ProductGridSkeleton } from '../components/ProductCard.jsx';
import SafeImg from '../components/SafeImg.jsx';
import { money, discount } from '../format.js';

function SectionHead({ title, to }) {
  return (
    <div className="mb-4 mt-10 flex items-center gap-4">
      <h2 className="text-xl font-bold md:text-2xl">{title}</h2>
      <div className="h-0.5 flex-1 bg-gradient-to-r from-brand-400 to-transparent" />
      {to && <Link to={to} className="text-sm font-semibold text-brand-700 hover:underline">View all</Link>}
    </div>
  );
}

function Hero({ items }) {
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [items]);
  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items]);
  if (!items.length) return null;
  const p = items[i];
  const off = discount(p.price, p.mrp);
  return (
    <div className="relative mt-5 h-64 overflow-hidden rounded-3xl bg-gray-200 sm:h-80 lg:h-[26rem]">
      <SafeImg key={p.id} src={p.heroImage} alt={p.name} loading="eager" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
      <div className="absolute inset-0 flex max-w-xl flex-col justify-center gap-2 p-6 text-white sm:p-10">
        <span className="w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest backdrop-blur">{p.brand} · New Arrivals</span>
        <h1 className="line-clamp-2 text-2xl font-bold leading-tight sm:text-4xl">{p.name}</h1>
        <p className="flex items-center gap-3 text-lg font-semibold">
          {money(p.price)} {off > 0 && <span className="rounded bg-brand-500 px-2 py-0.5 text-xs">{off}% OFF</span>}
          <span className="inline-flex items-center gap-1 text-sm"><Star size={14} className="fill-white" />{p.rating.toFixed(1)}</span>
        </p>
        <Link to={`/products/${p.id}`} className="btn-primary mt-2 w-fit !bg-white !from-white !to-white !text-gray-900">Shop now</Link>
      </div>
      {items.length > 1 && (
        <>
          <button className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 shadow sm:block" onClick={() => setI((i - 1 + items.length) % items.length)} aria-label="Previous"><ChevronLeft /></button>
          <button className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 shadow sm:block" onClick={() => setI((i + 1) % items.length)} aria-label="Next"><ChevronRight /></button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {items.map((_, n) => <button key={n} onClick={() => setI(n)} aria-label={`Slide ${n + 1}`} className={`h-2 rounded-full transition-all ${n === i ? 'w-6 bg-white' : 'w-2 bg-white/50'}`} />)}
          </div>
        </>
      )}
    </div>
  );
}

export default function Home() {
  const audience = useAppStore((s) => s.audience);
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    api.home(audience, ctrl.signal)
      .then((data) => setState({ loading: false, error: null, data }))
      .catch((e) => e.name !== 'AbortError' && setState({ loading: false, error: e.message, data: null }));
    return () => ctrl.abort();
  }, [audience]);

  const { data, loading, error } = state;

  return (
    <div className="container-x pb-6 pt-4">
      <AudienceTabs className="mt-2 md:max-w-xl" />
      {error && <div className="mt-6 rounded-2xl bg-red-50 p-6 text-center text-red-700" role="alert">{error}</div>}
      {loading && !data && <div className="mt-5 h-64 animate-pulse rounded-3xl bg-gray-200 sm:h-80" />}
      {data && (
        <div className={loading ? 'opacity-60 transition-opacity' : ''}>
          <Hero items={data.hero} />

          <SectionHead title="Explore by Categories" to={`/products?audience=${audience}`} />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {data.categories.map((c) => (
              <Link key={c.category} to={`/products?audience=${audience}&category=${encodeURIComponent(c.category)}`} className="group text-center">
                <div className="aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 to-sky-100 p-1.5 ring-1 ring-brand-100">
                  <SafeImg src={c.image} alt={c.category} className="h-full w-full rounded-xl object-cover transition group-hover:scale-105" />
                </div>
                <p className="mt-1.5 text-sm font-semibold leading-tight">{c.category}</p>
              </Link>
            ))}
          </div>

          <SectionHead title="Top Products" to={`/products?audience=${audience}&sort=rating`} />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">{data.topProducts.map((p) => <ProductCard key={p.id} product={p} />)}</div>

          <SectionHead title="Brand Partners" />
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
            {data.brands.map((b) => (
              <Link key={b.name} to={`/products?audience=${audience}&brand=${encodeURIComponent(b.name)}`} className="w-36 shrink-0 rounded-2xl border border-gray-100 p-3 text-center shadow-sm transition hover:shadow-md">
                <SafeImg src={b.logoUrl} alt={b.name} className="mx-auto h-16 w-16 rounded-full object-cover" />
                <p className="mt-2 truncate text-sm font-semibold">{b.name}</p>
                <p className="line-clamp-2 text-xs text-gray-500">{b.tagline}</p>
              </Link>
            ))}
          </div>

          <SectionHead title="New Arrivals" to={`/products?audience=${audience}&sort=newest`} />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">{data.newArrivals.map((p) => <ProductCard key={p.id} product={p} />)}</div>

          <SectionHead title="Nearby Stores" to="/stores" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.stores.map((s) => (
              <Link key={s.id} to={`/stores/${s.id}`} className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm transition hover:shadow-md">
                <SafeImg src={s.bannerUrl} alt={s.name} className="h-32 w-full object-cover" />
                <div className="p-3">
                  <p className="font-semibold">{s.name}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">~{s.distanceKm} km <Clock size={14} /> {s.deliveryMinutes} min <Star size={14} className="fill-brand-600 text-brand-600" /> {s.rating.toFixed(1)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
