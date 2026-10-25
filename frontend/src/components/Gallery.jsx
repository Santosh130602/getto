import { useEffect, useState } from 'react';
import SafeImg from './SafeImg.jsx';

// Amazon-style gallery: thumbnails + one large selected image.
export default function Gallery({ images = [], alt }) {
  const [sel, setSel] = useState(0);
  useEffect(() => setSel(0), [images]);
  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      <div className="no-scrollbar flex gap-2 overflow-x-auto md:max-h-[34rem] md:flex-col md:overflow-y-auto" role="listbox" aria-label="Product images">
        {images.map((src, i) => (
          <button key={src + i} role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => setSel(i)}
            className={`h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition md:h-24 md:w-20 ${i === sel ? 'border-brand-700 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}>
            <SafeImg src={src} alt={`${alt} view ${i + 1}`} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <div className="relative flex-1 overflow-hidden rounded-3xl bg-gray-100">
        <SafeImg key={images[sel]} src={images[sel]} alt={alt} loading="eager" className="aspect-[4/5] w-full object-cover" />
        <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">{sel + 1} / {images.length}</span>
      </div>
    </div>
  );
}
