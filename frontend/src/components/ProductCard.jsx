import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import SafeImg from './SafeImg.jsx';
import { money, discount } from '../format.js';

export function Highlight({ text, term }) {
  const words = (term || '').split(/\s+/).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!words.length) return text;
  const re = new RegExp(`(${words.join('|')})`, 'ig');
  return text.split(re).map((part, i) => (i % 2 ? <mark key={i} className="rounded bg-yellow-200 px-0.5 text-inherit">{part}</mark> : part));
}

export default function ProductCard({ product: p, term = '' }) {
  const off = discount(p.price, p.mrp);
  const out = p.stock === 0;
  return (
    <Link to={`/products/${p.id}`} className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
        <SafeImg src={p.image} alt={p.name} className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${out ? 'opacity-50' : ''}`} />
        {off > 0 && !out && <span className="absolute left-2 top-2 rounded-full bg-brand-700 px-2 py-0.5 text-xs font-semibold text-white">{off}% OFF</span>}
        {out && <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-xs font-semibold text-white">Out of stock</span>}
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-xs font-semibold shadow">
          {p.rating.toFixed(1)} <Star size={12} className="fill-brand-600 text-brand-600" />
        </span>
      </div>
      <div className="p-3">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-brand-700"><Highlight text={p.brand} term={term} /></p>
        <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5"><Highlight text={p.name} term={term} /></h3>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-semibold">{money(p.price)}</span>
          {p.mrp > p.price && <span className="text-xs text-gray-400 line-through">{money(p.mrp)}</span>}
        </div>
      </div>
    </Link>
  );
}

export function ProductGridSkeleton({ n = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-gray-100">
          <div className="aspect-[4/5] bg-gray-200" />
          <div className="space-y-2 p-3"><div className="h-3 w-1/3 rounded bg-gray-200" /><div className="h-4 rounded bg-gray-200" /><div className="h-4 w-1/2 rounded bg-gray-200" /></div>
        </div>
      ))}
    </div>
  );
}
