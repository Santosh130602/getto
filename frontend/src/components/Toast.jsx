import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '../store/app.js';

export default function Toast() {
  const toast = useToast((s) => s.toast);
  if (!toast) return null;
  const ok = toast.type === 'success';
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4" role="status">
      <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${ok ? 'bg-gray-900' : 'bg-red-600'}`}>
        {ok ? <CheckCircle2 size={18} className="text-brand-400" /> : <AlertCircle size={18} />}
        {toast.message}
      </div>
    </div>
  );
}
