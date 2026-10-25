import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X, SlidersHorizontal, SearchX, AlertTriangle } from 'lucide-react';
import { api } from '../api.js';
import useDebounce from '../hooks/useDebounce.js';
import ProductCard, { ProductGridSkeleton } from '../components/ProductCard.jsx';
import Pagination from '../components/Pagination.jsx';
import FilterPanel, { SORT_OPTIONS } from '../components/FilterPanel.jsx';
import SafeImg from '../components/SafeImg.jsx';

const list = (sp, k) => (sp.get(k) || '').split(',').filter(Boolean);
function parseFilters(sp) {
  return {
    q: sp.get('q') || '',
    audience: sp.get('audience') || '',
    category: list(sp, 'category'),
    brand: list(sp, 'brand'),
    minPrice: sp.get('minPrice') || '',
    maxPrice: sp.get('maxPrice') || '',
    minRating: sp.get('minRating') || '',
    inStock: sp.get('inStock') === 'true',
    sort: sp.get('sort') || '',
    page: Number(sp.get('page')) || 1,
  };
}

/**
 * Search + filter + sort + paginate. All state lives in the URL (shareable, back-button friendly).
 * `fixed` pins params that the user can't change (e.g. { storeId } on a store page).
 */
export default function Catalogue({ fixed = {}, title = 'Shop' }) {
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const f = useMemo(() => parseFilters(sp), [sp]);
  const fixedKey = JSON.stringify(fixed);

  const [qInput, setQInput] = useState(f.q);
  const dq = useDebounce(qInput, 350);
  const [sheet, setSheet] = useState(false);
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [retry, setRetry] = useState(0);
  const [options, setOptions] = useState({ categories: [], brands: [], price: null });
  const [sugg, setSugg] = useState([]);
  const [focus, setFocus] = useState(false);
  const boxRef = useRef(null);

  const update = (patch, replace = false) =>
    setSp((prev) => {
      const n = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (v === '' || v == null || v === false || (Array.isArray(v) && !v.length)) n.delete(k);
        else n.set(k, Array.isArray(v) ? v.join(',') : String(v));
      }
      if (!('page' in patch)) n.delete('page'); // any criteria change goes back to page 1
      return n;
    }, { replace });

  // debounced typing -> URL
  useEffect(() => { if (dq.trim() !== f.q) update({ q: dq.trim() }, true); /* eslint-disable-next-line */ }, [dq]);
  // external URL change (navbar search, clear) -> input
  useEffect(() => { if (f.q !== qInput.trim() && f.q !== dq.trim()) setQInput(f.q); /* eslint-disable-next-line */ }, [f.q]);

  // Fetch products. Stale-response protection: abort the previous request + ignore late results.
  useEffect(() => {
    const ctrl = new AbortController();
    let ignore = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    const qs = new URLSearchParams(sp);
    Object.entries(fixed).forEach(([k, v]) => qs.set(k, v));
    qs.set('limit', '20');
    api.products(qs.toString(), ctrl.signal)
      .then((data) => { if (!ignore) setState({ loading: false, error: null, data }); })
      .catch((e) => { if (ignore || e.name === 'AbortError') return; setState((s) => ({ ...s, loading: false, error: e.details?.[0]?.message || e.message })); });
    return () => { ignore = true; ctrl.abort(); };
    // eslint-disable-next-line
  }, [sp.toString(), fixedKey, retry]);

  // Filter options follow the chosen audience / store
  useEffect(() => {
    const ctrl = new AbortController();
    const qs = new URLSearchParams();
    if (f.audience) qs.set('audience', f.audience);
    if (fixed.storeId) qs.set('storeId', fixed.storeId);
    api.filters(qs.toString(), ctrl.signal).then(setOptions).catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line
  }, [f.audience, fixedKey]);

  // Autocomplete
  useEffect(() => {
    if (dq.trim().length < 2) { setSugg([]); return; }
    const ctrl = new AbortController();
    api.suggest(dq.trim(), ctrl.signal).then((r) => setSugg(r.data)).catch(() => {});
    return () => ctrl.abort();
  }, [dq]);
  useEffect(() => {
    const h = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setFocus(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const { data, loading, error } = state;
  const total = data?.pagination.total ?? 0;
  const activeCount = [f.audience, f.category.length, f.brand.length, f.minPrice, f.maxPrice, f.minRating, f.inStock, f.sort].filter(Boolean).length;
  const hasCriteria = activeCount > 0 || !!f.q;

  const applyDraft = (d) => { update({ audience: d.audience, category: d.category, brand: d.brand, minPrice: d.minPrice, maxPrice: d.maxPrice, minRating: d.minRating, inStock: d.inStock, sort: d.sort }); setSheet(false); };
  const clearAll = () => { setQInput(''); setSp({}, { replace: false }); setSheet(false); };
  const changePage = (p) => { update({ page: p > 1 ? p : '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="container-x py-4 md:py-8">
      <h1 className="mb-4 text-2xl font-bold md:text-3xl">{title}</h1>

      <div className="flex gap-3">
        <div ref={boxRef} className="relative flex-1">
          <Search size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-11 pr-10" type="search" placeholder="Search by name, brand, category or SKU…"
            value={qInput} onChange={(e) => { setQInput(e.target.value); setFocus(true); }} onFocus={() => setFocus(true)}
            aria-label="Search products" maxLength={100}
          />
          {qInput && <button onClick={() => setQInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-label="Clear search"><X size={18} /></button>}
          {focus && sugg.length > 0 && qInput.trim().length >= 2 && (
            <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
              {sugg.map((s) => (
                <li key={s.id}>
                  <button className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50" onClick={() => { setFocus(false); navigate(`/products/${s.id}`); }}>
                    <SafeImg src={s.image} alt="" className="h-10 w-8 rounded object-cover" />
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{s.name}</span><span className="text-xs text-gray-500">{s.brand} · {s.category}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button className="btn-ghost relative !px-4 lg:hidden" onClick={() => setSheet(true)} aria-label="Open filters">
          <SlidersHorizontal size={20} />
          {activeCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 text-xs text-white">{activeCount}</span>}
        </button>
      </div>

      <div className="mt-6 flex gap-8">
        <aside className="sticky top-20 hidden h-[calc(100vh-6rem)] w-72 shrink-0 lg:block"><FilterPanel value={f} options={options} showAudience onApply={applyDraft} onClear={clearAll} /></aside>

        <section className="min-w-0 flex-1" aria-live="polite">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-600">
              {loading && !data ? 'Searching…' : <><b className="text-gray-900">{total.toLocaleString('en-IN')}</b> product{total === 1 ? '' : 's'}{f.q && <> for “{f.q}”</>}</>}
            </p>
            <div className="flex items-center gap-2">
              {hasCriteria && <button onClick={clearAll} className="text-sm font-semibold text-brand-700 hover:underline">Clear all filters</button>}
              <select className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm" value={f.sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort products">
                <option value="">{f.q ? 'Relevance' : 'Newest'}</option>
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center" role="alert">
              <AlertTriangle className="mx-auto mb-2 text-red-500" size={36} />
              <p className="font-semibold text-red-700">Something went wrong</p>
              <p className="mt-1 text-sm text-red-600">{error}</p>
              <button className="btn-primary mt-4" onClick={() => setRetry((r) => r + 1)}>Try again</button>
            </div>
          ) : loading && !data ? (
            <ProductGridSkeleton n={8} />
          ) : total === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-10 text-center">
              <SearchX className="mx-auto mb-3 text-gray-400" size={44} />
              <p className="text-lg font-semibold">No products found</p>
              <p className="mt-1 text-sm text-gray-500">Try different keywords or remove some filters.</p>
              {data?.didYouMean && <p className="mt-3 text-sm">Did you mean <button className="font-semibold text-brand-700 underline" onClick={() => setQInput(data.didYouMean)}>{data.didYouMean}</button>?</p>}
              {hasCriteria && <button className="btn-primary mt-5" onClick={clearAll}>Clear all filters</button>}
            </div>
          ) : (
            <>
              <div className={`grid grid-cols-2 gap-3 transition-opacity sm:gap-4 md:grid-cols-3 xl:grid-cols-4 ${loading ? 'opacity-50' : ''}`}>
                {data.data.map((p) => <ProductCard key={p.id} product={p} term={f.q} />)}
              </div>
              <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={changePage} />
            </>
          )}
        </section>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 flex h-[85vh] flex-col rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">Filters</h2><button onClick={() => setSheet(false)} aria-label="Close filters"><X size={26} /></button></div>
            <FilterPanel value={f} options={options} showAudience onApply={applyDraft} onClear={clearAll} />
          </div>
        </div>
      )}
    </div>
  );
}
