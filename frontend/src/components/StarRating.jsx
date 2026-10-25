import { Star } from 'lucide-react';

export default function StarRating({ value = 0, size = 16, showValue = true, count }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex" aria-label={`${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} size={size} className={n <= Math.round(value) ? 'fill-brand-600 text-brand-600' : 'text-gray-300'} />
        ))}
      </span>
      {showValue && <span className="text-sm font-semibold">{Number(value).toFixed(1)}</span>}
      {count != null && <span className="text-sm text-gray-500">({count})</span>}
    </span>
  );
}
