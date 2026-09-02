import React, { createContext, useCallback, useContext, useState } from 'react';

const Ctx = createContext(null);

export function UIProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, kind = 'info') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <Ctx.Provider value={{
      sidebarOpen, setSidebarOpen,
      toast, showToast,
    }}>
      {children}
      {toast && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded shadow-lg text-white text-sm
          ${toast.kind === 'error' ? 'bg-jg-error' :
            toast.kind === 'success' ? 'bg-jg-exito' :
            toast.kind === 'warn' ? 'bg-jg-alerta' : 'bg-jg-primario'}`}>
          {toast.msg}
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useUI = () => useContext(Ctx);
