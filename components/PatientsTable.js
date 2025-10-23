import React, { useMemo } from 'https://esm.sh/react@18.2.0';
import { formatDuration, formatDurationWithMinutes } from '../utils/formatDuration.js';

const STATUS_COPY = {
  ok: 'OK',
  cancelada: 'Cancelada',
  pendiente: 'Pendiente',
};

export function PatientsTable({ patients, timeFormat, expandedPatientId, onTogglePatient }) {
  const compact = timeFormat === 'compact';
  const sortedPatients = useMemo(() => {
    return [...patients].sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [patients]);

  const rows = useMemo(() => {
    return sortedPatients.map((patient) => ({
      ...patient,
      formattedHours: formatDuration(patient.totalMinutes, { compact }),
      formattedWeeks: patient.weeks.map((week) => ({
        ...week,
        formattedDuration: formatDurationWithMinutes(week.minutes, { compact }),
      })),
    }));
  }, [sortedPatients, compact]);

  return (
    <section className="card patients-card" aria-labelledby="patients-heading">
      <header className="card-header">
        <div>
          <h2 id="patients-heading">Pacientes activos</h2>
          <p className="muted">Ordenados por horas esta semana</p>
        </div>
      </header>
      {rows.length === 0 ? (
        <div className="empty-state">
          <p>No hay sesiones esta semana.</p>
          <button type="button" className="link-button">Añadir sesión</button>
        </div>
      ) : (
        <div className="patients-table" role="table" aria-label="Pacientes activos">
          <div className="patients-header" role="row">
            <div role="columnheader">Nombre</div>
            <div role="columnheader">Sesiones</div>
            <div role="columnheader">Horas</div>
            <div role="columnheader">Estado</div>
            <div role="columnheader" aria-hidden="true"></div>
          </div>
          {rows.map((patient) => {
            const isExpanded = expandedPatientId === patient.id;
            const status = STATUS_COPY[patient.status] || '—';
            return (
              <div key={patient.id} className="patient-row" role="rowgroup">
                <div className="patient-summary" role="row">
                  <div role="cell" className="patient-name">{patient.name}</div>
                  <div role="cell">{patient.sessions}</div>
                  <div role="cell">{patient.formattedHours}</div>
                  <div role="cell">
                    <span className={`status-tag status-${patient.status}`}>{status}</span>
                  </div>
                  <div role="cell" className="align-end">
                    <button
                      type="button"
                      className="accordion-trigger"
                      aria-expanded={isExpanded}
                      aria-controls={`patient-${patient.id}`}
                      onClick={() => onTogglePatient(isExpanded ? null : patient.id)}
                    >
                      {isExpanded ? 'Cerrar' : 'Ver detalle'}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div
                    id={`patient-${patient.id}`}
                    role="region"
                    aria-label={`Detalle semanal de ${patient.name}`}
                    className="patient-detail"
                  >
                    <ul>
                      {patient.formattedWeeks.map((week) => (
                        <li key={week.label}>
                          <div className="detail-row">
                            <span>{week.label}</span>
                            <span>{week.formattedDuration}</span>
                          </div>
                          <div className="detail-subrow">
                            {week.sessions} sesiones · {STATUS_COPY[week.status] || week.status}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
