import { useEffect, useState } from 'react';

export const SORT_OPTIONS = [
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Newest first' },
  { value: 'name', label: 'Name: A–Z' },
];

const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function Section({ title, children }) {
  return (
    <fieldset className="border-b border-gray-100 py-4 first:pt-0">
      <legend className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-900">{title}</legend>
      {children}
    </fieldset>
  );
}
function Check({ type = 'checkbox', checked, onChange, children, name }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1.5 text-[15px]">
      <input type={type} name={name} checked={checked} onChange={onChange} className="h-5 w-5 accent-brand-700" />
      <span className="flex-1">{children}</span>
    </label>
  );
}

export default function FilterPanel({ value, options, showAudience = true, onApply, onClear }) {
  const [d, setD] = useState(value);
  useEffect(() => setD(value), [value]);

  const min = d.minPrice === '' ? null : Number(d.minPrice);
  const max = d.maxPrice === '' ? null : Number(d.maxPrice);
  let error = '';
  if ((min != null && (Number.isNaN(min) || min < 0)) || (max != null && (Number.isNaN(max) || max < 0))) error = 'Prices must be valid, non-negative numbers';
  else if (min != null && max != null && min > max) error = 'Min price cannot be greater than max price';

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-1 pr-2">
        {showAudience && (
          <Section title="Category">
            {[['', 'All'], ['men', 'Men'], ['women', 'Women'], ['kids', 'Kids']].map(([v, l]) => (
              <Check key={v} type="radio" name="audience" checked={d.audience === v} onChange={() => setD({ ...d, audience: v, category: [], brand: [] })}>{l}</Check>
            ))}
          </Section>
        )}
        <Section title="Sub-category">
          <div className="max-h-52 overflow-y-auto">
            {options.categories.map((c) => (
              <Check key={c.name} checked={d.category.includes(c.name)} onChange={() => setD({ ...d, category: toggle(d.category, c.name) })}>
                {c.name} <span className="text-xs text-gray-400">({c.count})</span>
              </Check>
            ))}
          </div>
        </Section>
        <Section title="Brand">
          <div className="max-h-52 overflow-y-auto">
            {options.brands.map((b) => (
              <Check key={b.name} checked={d.brand.includes(b.name)} onChange={() => setD({ ...d, brand: toggle(d.brand, b.name) })}>
                {b.name} <span className="text-xs text-gray-400">({b.count})</span>
              </Check>
            ))}
          </div>
        </Section>
        <Section title="Price (₹)">
          <div className="flex items-center gap-2">
            <input className="input !py-2" type="number" min="0" inputMode="numeric" placeholder={options.price ? `Min ${Math.floor(options.price.min)}` : 'Min'} value={d.minPrice} onChange={(e) => setD({ ...d, minPrice: e.target.value })} aria-label="Minimum price" />
            <span className="text-gray-400">–</span>
            <input className="input !py-2" type="number" min="0" inputMode="numeric" placeholder={options.price ? `Max ${Math.ceil(options.price.max)}` : 'Max'} value={d.maxPrice} onChange={(e) => setD({ ...d, maxPrice: e.target.value })} aria-label="Maximum price" />
          </div>
          {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
        </Section>
        <Section title="Rating">
          {[['', 'Any'], ['4', '4★ & above'], ['3', '3★ & above'], ['2', '2★ & above']].map(([v, l]) => (
            <Check key={v} type="radio" name="rating" checked={d.minRating === v} onChange={() => setD({ ...d, minRating: v })}>{l}</Check>
          ))}
        </Section>
        <Section title="Availability">
          <Check checked={d.inStock} onChange={() => setD({ ...d, inStock: !d.inStock })}>In stock only</Check>
        </Section>
        <Section title="Sort by">
          <Check type="radio" name="sort" checked={!d.sort} onChange={() => setD({ ...d, sort: '' })}>{value.q ? 'Relevance' : 'Newest (default)'}</Check>
          {SORT_OPTIONS.map((o) => (
            <Check key={o.value} type="radio" name="sort" checked={d.sort === o.value} onChange={() => setD({ ...d, sort: o.value })}>{o.label}</Check>
          ))}
        </Section>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
        <button type="button" className="btn-ghost" onClick={onClear}>Clear</button>
        <button type="button" className="btn-primary" disabled={!!error} onClick={() => onApply(d)}>Apply</button>
      </div>
    </div>
  );
}
