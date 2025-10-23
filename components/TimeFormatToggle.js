import React from 'https://esm.sh/react@18.2.0';

export const TIME_FORMATS = {
  DECIMAL: 'decimal',
  COMPACT: 'compact',
};

const labels = {
  [TIME_FORMATS.DECIMAL]: '1.5 h',
  [TIME_FORMATS.COMPACT]: '1:30 h',
};

export function TimeFormatToggle({ value, onChange }) {
  return (
    <div className="time-format-toggle" role="group" aria-label="Formato de tiempo">
      {Object.values(TIME_FORMATS).map((format) => {
        const isActive = value === format;
        return (
          <button
            key={format}
            type="button"
            className={isActive ? 'active' : ''}
            onClick={() => onChange(format)}
            aria-pressed={isActive}
          >
            {labels[format]}
          </button>
        );
      })}
    </div>
  );
}
