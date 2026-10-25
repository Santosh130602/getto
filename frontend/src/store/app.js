import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Persisted: selected audience (Men/Women/Kids) + anonymous clientId used to fetch "my orders".
export const useAppStore = create(
  persist(
    (set) => ({
      audience: 'men',
      clientId: crypto.randomUUID(),
      setAudience: (audience) => set({ audience }),
    }),
    { name: 'getto-app' }
  )
);

// Not persisted: tiny toast system.
export const useToast = create((set) => ({
  toast: null,
  show: (message, type = 'success') => {
    set({ toast: { message, type, id: Date.now() } });
    setTimeout(() => set((s) => (s.toast && Date.now() - s.toast.id >= 2400 ? { toast: null } : s)), 2500);
  },
  hide: () => set({ toast: null }),
}));
