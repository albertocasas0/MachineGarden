import React, { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full ${maxWidth} max-h-[90vh] flex flex-col`}>
        {title && (
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-jg-texto">{title}</h2>
            <button onClick={onClose} className="text-jg-texto/60 hover:text-jg-texto text-xl leading-none">×</button>
          </div>
        )}
        <div className="p-5 overflow-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t bg-jg-fondoSuave/40 rounded-b-lg">{footer}</div>}
      </div>
    </div>
  );
}
