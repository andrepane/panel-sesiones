import React from 'https://esm.sh/react@18.2.0';

export function Tabs({ value, onChange, options }) {
  return (
    <div className="tabs" role="tablist" aria-label="Vistas del panel">
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={isActive}
            className={isActive ? 'active' : ''}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
