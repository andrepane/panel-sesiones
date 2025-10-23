import React from 'https://esm.sh/react@18.2.0';

export function AlertsPanel({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <section className="card alerts-card" aria-labelledby="alerts-heading">
      <header className="card-header">
        <div>
          <h2 id="alerts-heading">Alertas / Incidencias</h2>
          <p className="muted">Revisa estas acciones prioritarias</p>
        </div>
      </header>
      <ul className="alerts-list">
        {alerts.map((alert) => (
          <li key={alert.id} className={`alert-item alert-${alert.severity}`}>
            <div className="alert-title">{alert.title}</div>
            {alert.description ? <p className="alert-description">{alert.description}</p> : null}
            {alert.cta ? (
              <button type="button" className="link-button">{alert.cta}</button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
