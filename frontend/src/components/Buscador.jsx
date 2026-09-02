import React, { useState } from 'react';
import { Search } from 'lucide-react';

// Sección 8: buscadores disparan al presionar lupa o Enter, no por tecla.
export default function Buscador({ placeholder = 'Buscar…', onBuscar, initial = '' }) {
  const [value, setValue] = useState(initial);
  const submit = () => onBuscar?.(value.trim());
  return (
    <div className="flex items-stretch w-full sm:w-72 border border-gray-300 rounded overflow-hidden bg-white">
      <input
        className="flex-1 px-3 py-2 text-sm outline-none"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
      />
      <button onClick={submit} className="px-3 text-jg-secundario hover:bg-jg-fondoSuave btn-tap" aria-label="Buscar">
        <Search size={18} />
      </button>
    </div>
  );
}
