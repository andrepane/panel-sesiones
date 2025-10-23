import React, { useMemo } from 'https://esm.sh/react@18.2.0';
import { formatDuration } from '../utils/formatDuration.js';

export function SummaryHeader({ summary, timeFormat }) {
  const { totalMinutes, sessions, averageMinutesPerSession, occupancy } = summary;
  const compact = timeFormat === 'compact';

  const formatted = useMemo(() => {
    return {
      total: formatDuration(totalMinutes, { compact }),
      average: formatDuration(averageMinutesPerSession, { compact }).replace(' h', ''),
      occupancyLabel: `${occupancy.toFixed(0)}% ocupación`,
    };
  }, [totalMinutes, averageMinutesPerSession, occupancy, compact]);

  return (
    <section className="card summary-card" aria-labelledby="summary-heading">
      <header className="card-header">
        <div>
          <h2 id="summary-heading">Carga semanal total</h2>
          <p className="muted">Resumen de la semana actual</p>
        </div>
      </header>
      <div className="kpi-grid" role="list">
        <div className="kpi" role="listitem">
          <span className="kpi-label">Horas totales</span>
          <span className="kpi-value">{formatted.total}</span>
        </div>
        <div className="kpi" role="listitem">
          <span className="kpi-label">Sesiones</span>
          <span className="kpi-value">{sessions}</span>
        </div>
        <div className="kpi" role="listitem">
          <span className="kpi-label">Promedio h/sesión</span>
          <span className="kpi-value">{formatted.average}</span>
        </div>
      </div>
      <div className="load-bar" role="img" aria-label={`Ocupación semanal ${occupancy}%`}>
        <div className="load-bar-track">
          <div className="load-bar-fill" style={{ width: `${Math.min(occupancy, 100)}%` }} />
        </div>
        <span className="load-bar-label">{formatted.occupancyLabel}</span>
      </div>
    </section>
  );
}
