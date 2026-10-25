const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const money = (n) => inr.format(n ?? 0);
export const discount = (price, mrp) => (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);
export const orderNo = (id) => `GT-${String(id).padStart(6, '0')}`;
export const dateFmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
