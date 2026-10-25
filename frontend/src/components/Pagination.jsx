import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  for (let p = start; p <= Math.min(totalPages, start + 4); p++) pages.push(p);
  const btn = 'flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-semibold transition';
  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
      <button className={`${btn} bg-gray-100 disabled:opacity-40`} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
      {start > 1 && <><button className={`${btn} bg-gray-100`} onClick={() => onChange(1)}>1</button><span className="px-1 text-gray-400">…</span></>}
      {pages.map((p) => (
        <button key={p} onClick={() => onChange(p)} aria-current={p === page ? 'page' : undefined}
          className={`${btn} ${p === page ? 'bg-gradient-to-r from-brand-400 to-brand-700 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{p}</button>
      ))}
      {start + 4 < totalPages && <><span className="px-1 text-gray-400">…</span><button className={`${btn} bg-gray-100`} onClick={() => onChange(totalPages)}>{totalPages}</button></>}
      <button className={`${btn} bg-gray-100 disabled:opacity-40`} disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
    </nav>
  );
}
