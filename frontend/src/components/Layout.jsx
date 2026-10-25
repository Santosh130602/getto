import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Store, ShoppingBag, ShoppingCart, ClipboardList, Search, MapPin, ChevronDown } from 'lucide-react';
import { useAppStore } from '../store/app.js';
import { useCartStore } from '../store/cart.js';
import SafeImg from './SafeImg.jsx';
import Toast from './Toast.jsx';

export const AUDIENCES = [
  { key: 'men', label: 'Men', img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTLbjEnCVjzdQLZgBNxHH6udRfi1Iq1srx1MgVtMtBhRw&s=10' },
  { key: 'women', label: 'Women', img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpTKAAzUp_aIp72OS6l62d0VH1HO5c2uDfPOVL5omP8NU5KGmYXh3BH5k&s=10' },
  { key: 'kids', label: 'Kids', img: 'https://m.media-amazon.com/images/I/81S2Aelj+4L._AC_UY350_.jpg' },
];

function CartBadge() {
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.qty, 0));
  if (!count) return null;
  return <span className="absolute -right-2 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-700 px-1 text-[11px] font-bold text-white">{count}</span>;
}

function DesktopNav() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const link = ({ isActive }) => `text-sm font-semibold transition ${isActive ? 'text-brand-700' : 'text-gray-700 hover:text-brand-700'}`;
  return (
    <header className="sticky top-0 z-40 hidden border-b border-gray-100 bg-white/95 backdrop-blur md:block">
      <div className="container-x flex h-16 items-center gap-6">
        <Link to="/" className="bg-gradient-to-r from-brand-400 to-brand-700 bg-clip-text text-2xl font-bold text-transparent">Getto</Link>
        <form className="relative max-w-md flex-1" onSubmit={(e) => { e.preventDefault(); navigate(`/products?q=${encodeURIComponent(q.trim())}`); }}>
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input !rounded-full !py-2 pl-10" placeholder="Search products, brands, SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <nav className="ml-auto flex items-center gap-7">
          <NavLink to="/" end className={link}>Home</NavLink>
          <NavLink to="/products" className={link}>Shop</NavLink>
          <NavLink to="/stores" className={link}>Stores</NavLink>
          <NavLink to="/orders" className={link}>My Orders</NavLink>
          <NavLink to="/cart" className={link}><span className="relative inline-flex items-center gap-1"><ShoppingCart size={20} />Cart<CartBadge /></span></NavLink>
        </nav>
      </div>
    </header>
  );
}

function MobileHeader() {
  const { pathname } = useLocation();
  if (pathname !== '/') return null;
  return (
    <header className="container-x pt-4 md:hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="bg-gradient-to-r from-brand-400 to-brand-700 bg-clip-text text-2xl font-bold text-transparent">Delivery in 60 Mins</p>
          <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-gray-500"><MapPin size={16} className="text-brand-600" />Hyderabad, India<ChevronDown size={16} /></p>
        </div>
        <Link to="/products" aria-label="Search" className="rounded-full p-2"><Search size={26} /></Link>
      </div>
    </header>
  );
}

function BottomNav() {
  const item = ({ isActive }) => `relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${isActive ? 'text-brand-700' : 'text-gray-800'}`;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,.06)] md:hidden" aria-label="Primary">
      <div className="flex items-end">
        <NavLink to="/" end className={item}><Home size={24} />Home</NavLink>
        <NavLink to="/stores" className={item}><Store size={24} />Stores</NavLink>
        <NavLink to="/products" className="relative flex flex-1 flex-col items-center gap-0.5 pb-2 text-[11px] font-semibold text-gray-800">
          <span className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-lg ring-4 ring-white"><ShoppingBag size={26} /></span>
          Shop
        </NavLink>
        <NavLink to="/cart" className={item}><span className="relative"><ShoppingCart size={24} /><CartBadge /></span>Cart</NavLink>
        <NavLink to="/orders" className={item}><ClipboardList size={24} />Orders</NavLink>
      </div>
    </nav>
  );
}

export function AudienceTabs({ className = '' }) {
  const { audience, setAudience } = useAppStore();
  return (
    <div className={`grid grid-cols-3 gap-2 sm:gap-3 ${className}`} role="tablist">
      {AUDIENCES.map((a) => (
        <button key={a.key} role="tab" aria-selected={audience === a.key} onClick={() => setAudience(a.key)}
          className={`flex items-center justify-center gap-2 overflow-hidden rounded-xl border px-2 py-1.5 font-semibold transition sm:justify-start sm:gap-3 ${audience === a.key ? 'border-brand-200 bg-sky-100 text-gray-900' : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'}`}>
          <SafeImg src={a.img} alt="" className="hidden h-10 w-10 rounded-full object-cover sm:block" />
          {a.label}
        </button>
      ))}
    </div>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <DesktopNav />
      <MobileHeader />
      <main key={pathname.split('/')[1]}><Outlet /></main>
      <footer className="mt-16 hidden border-t border-gray-100 py-8 text-center text-sm text-gray-500 md:block">© {new Date().getFullYear()} Getto India · Smart Product Search & Catalogue</footer>
      <BottomNav />
      <Toast />
    </div>
  );
}
