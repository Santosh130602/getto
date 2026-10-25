const BASE = 'https://getto-dis5.onrender.com' || import.meta.env.VITE_API_URL || '/api';

async function request(path, { signal, method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    signal,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.details = data?.details;
    throw err;
  }
  return data;
}

export const api = {
  home: (audience, signal) => request(`/home?audience=${audience}`, { signal }),
  products: (qs, signal) => request(`/products?${qs}`, { signal }),
  suggest: (q, signal) => request(`/products/suggest?q=${encodeURIComponent(q)}`, { signal }),
  product: (id, signal) => request(`/products/${id}`, { signal }),
  similar: (id, signal) => request(`/products/${id}/similar`, { signal }),
  addReview: (id, body) => request(`/products/${id}/reviews`, { method: 'POST', body }),
  filters: (qs, signal) => request(`/meta/filters?${qs}`, { signal }),
  stores: (signal) => request('/stores', { signal }),
  store: (id, signal) => request(`/stores/${id}`, { signal }),
  placeOrder: (body) => request('/orders', { method: 'POST', body }),
  orders: (clientId, signal) => request(`/orders?clientId=${clientId}`, { signal }),
  cancelOrder: (id, clientId) => request(`/orders/${id}/cancel`, { method: 'POST', body: { clientId } }),
};
