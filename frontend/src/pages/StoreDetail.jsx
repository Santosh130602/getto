import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin } from 'lucide-react';
import { api } from '../api.js';
import Catalogue from './Catalogue.jsx';
import SafeImg from '../components/SafeImg.jsx';
import StarRating from '../components/StarRating.jsx';

export default function StoreDetail() {
  const { id } = useParams();
  const [store, setStore] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    const ctrl = new AbortController();
    setStore(null); setError(null);
    api.store(id, ctrl.signal).then(setStore).catch((e) => e.name !== 'AbortError' && setError(e.message));
    return () => ctrl.abort();
  }, [id]);

  if (error) return <div className="container-x py-20 text-center"><p className="text-lg font-semibold">{error}</p><Link to="/stores" className="btn-primary mt-5">All stores</Link></div>;
  return (
    <>
      <div className="container-x pt-4">
        <Link to="/stores" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft size={16} />All stores</Link>
        {store && (
          <div className="relative h-40 overflow-hidden rounded-3xl sm:h-56">
            <SafeImg src={store.bannerUrl} alt={store.name} loading="eager" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-4 left-5 text-white">
              <h1 className="text-2xl font-bold sm:text-3xl">{store.name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-3 text-sm"><span className="inline-flex items-center gap-1"><MapPin size={14} />{store.city} · ~{store.distanceKm} km</span><span className="inline-flex items-center gap-1"><Clock size={14} />{store.deliveryMinutes} min</span><StarRating value={store.rating} size={14} /></p>
            </div>
          </div>
        )}
      </div>
      <Catalogue fixed={{ storeId: id }} title={store ? `Shop at ${store.name}` : 'Store'} />
    </>
  );
}
