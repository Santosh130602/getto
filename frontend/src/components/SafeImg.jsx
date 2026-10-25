import { useEffect, useState } from 'react';

const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="50%" fill="#9ca3af" font-family="sans-serif" font-size="28" text-anchor="middle">No image</text></svg>'
  );

export default function SafeImg({ src, alt = '', className = '', ...rest }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [src]);
  return <img src={bad || !src ? FALLBACK : src} alt={alt} loading="lazy" onError={() => setBad(true)} className={className} {...rest} />;
}
