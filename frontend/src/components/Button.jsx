import React from 'react';

// Variantes de la paleta sección 2.2.
const VARIANTS = {
  primary:   'bg-jg-primario text-white hover:bg-jg-secundario focus:ring-jg-primario',
  secondary: 'bg-white border border-jg-secundario text-jg-secundario hover:bg-jg-fondoSuave',
  danger:    'bg-jg-error text-white hover:bg-red-700 focus:ring-jg-error',
  warn:      'bg-jg-alerta text-white hover:amber-600',
  ghost:     'text-jg-secundario hover:bg-jg-fondoSuave',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  ...rest
}) {
  const sizeCls = size === 'lg' ? 'px-5 py-3 text-base' : size === 'sm' ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm';
  return (
    <button
      type={type}
      className={`inline-flex items-center gap-2 rounded font-medium transition
        focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed
        btn-tap ${VARIANTS[variant]} ${sizeCls} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
