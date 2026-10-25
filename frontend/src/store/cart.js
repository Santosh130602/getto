import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_QTY = 10;
const keyOf = (id, size) => `${id}:${size || '-'}`;

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      add: (product, size, qty = 1) => {
        const key = keyOf(product.id, size);
        const cap = Math.min(MAX_QTY, product.stock);
        set((s) => {
          const existing = s.items.find((i) => i.key === key);
          if (existing) {
            return { items: s.items.map((i) => (i.key === key ? { ...i, qty: Math.min(cap, i.qty + qty), stock: product.stock } : i)) };
          }
          return {
            items: [...s.items, {
              key, id: product.id, name: product.name, brand: product.brand, image: product.images?.[0] ?? product.image,
              price: product.price, mrp: product.mrp, size, qty: Math.min(cap, qty), stock: product.stock,
            }],
          };
        });
      },
      setQty: (key, qty) =>
        set((s) => ({
          items: s.items.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(qty, MAX_QTY, i.stock)) } : i)),
        })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((n, i) => n + i.qty, 0),
      subtotal: () => get().items.reduce((n, i) => n + i.price * i.qty, 0),
      savings: () => get().items.reduce((n, i) => n + Math.max(0, i.mrp - i.price) * i.qty, 0),
    }),
    { name: 'getto-cart' }
  )
);
