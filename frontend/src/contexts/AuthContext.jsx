import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../services/api.js';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Rehidrata la sesión al iniciar.
  useEffect(() => {
    let cancel = false;
    async function init() {
      if (!tokenStore.get()) { setReady(true); return; }
      try {
        const me = await api('/auth/me');
        if (!cancel) setUser(me);
      } catch {
        tokenStore.clear();
      } finally {
        if (!cancel) setReady(true);
      }
    }
    init();
    return () => { cancel = true; };
  }, []);

  async function login({ username, password, next }) {
    const data = await api('/auth/login', { method: 'POST', body: { username, password, next } });
    tokenStore.set(data.token);
    setUser(data.user);
    return data;
  }

  // Logout invalida en cliente (JWT sin estado). El backend ya lo confirma.
  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }); } catch {}
    tokenStore.clear();
    setUser(null);
  }

  function isRol(...roles) {
    return !!user && roles.includes(user.rol);
  }

  return (
    <Ctx.Provider value={{ user, ready, login, logout, isRol }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
