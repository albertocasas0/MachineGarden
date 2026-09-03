// Cliente HTTP centralizado. Adjunta el JWT desde AuthContext.
// El proxy de Vite redirige /api -> http://localhost:4000 (vite.config.js).

const TOKEN_KEY = 'jg_token';
export const API_URL = 'https://machinegarden-api.onrender.com';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export async function api(path, { method = 'GET', body, headers = {}, raw = false, isForm = false } = {}) {
  const token = tokenStore.get();
  const h = { ...headers };
  if (!isForm) h['Content-Type'] = 'application/json';
  if (token) h['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: h,
    body: isForm ? body : (body !== undefined ? JSON.stringify(body) : undefined),
  });

  if (raw) return res;

  const ct = res.headers.get('Content-Type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = (data && data.error) || (typeof data === 'string' ? data : 'Error de red.');
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}
