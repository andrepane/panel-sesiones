import React, { useMemo, useState, useCallback } from 'https://esm.sh/react@18.2.0';
import { SummaryHeader } from './SummaryHeader.js';
import { PatientsTable } from './PatientsTable.js';
import { AlertsPanel } from './AlertsPanel.js';
import { TimeFormatToggle, TIME_FORMATS } from './TimeFormatToggle.js';
import { Tabs } from './Tabs.js';
import { weeklySummary, weeklyPatients, alerts } from '../data/weeklyData.js';

const TAB_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'pacientes', label: 'Por paciente' },
  { value: 'historico', label: 'Histórico' },
];

export function App({ summary = weeklySummary, patients = weeklyPatients, alertsList = alerts }) {
  const [timeFormat, setTimeFormat] = useState(TIME_FORMATS.DECIMAL);
  const [activeTab, setActiveTab] = useState('general');
  const [expandedPatientId, setExpandedPatientId] = useState(null);

  const memoSummary = useMemo(() => summary, [summary]);
  const memoPatients = useMemo(() => patients, [patients]);
  const memoAlerts = useMemo(() => alertsList, [alertsList]);

  const handleTimeFormatChange = useCallback((nextFormat) => {
    setTimeFormat(nextFormat);
  }, []);

  const handleTabChange = useCallback((nextTab) => {
    setActiveTab(nextTab);
    setExpandedPatientId(null);
  }, []);

  const handleTogglePatient = useCallback((patientId) => {
    setExpandedPatientId(patientId);
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Sesiones por semana</h1>
          <p className="muted">Controla de un vistazo la carga y las incidencias</p>
        </div>
        <TimeFormatToggle value={timeFormat} onChange={handleTimeFormatChange} />
      </header>

      <Tabs value={activeTab} onChange={handleTabChange} options={TAB_OPTIONS} />

      <main className="app-content">
        {(activeTab === 'general' || activeTab === 'historico') && (
          <SummaryHeader summary={memoSummary} timeFormat={timeFormat} />
        )}

        {(activeTab === 'general' || activeTab === 'pacientes') && (
          <PatientsTable
            patients={memoPatients}
            timeFormat={timeFormat}
            expandedPatientId={expandedPatientId}
            onTogglePatient={handleTogglePatient}
          />
        )}

        {(activeTab === 'general' || memoAlerts.length > 0) && (
          <AlertsPanel alerts={memoAlerts} />
        )}

        {activeTab === 'historico' && (
          <section className="card history-card">
            <header className="card-header">
              <div>
                <h2>Histórico</h2>
                <p className="muted">Compara semanas anteriores y objetivos</p>
              </div>
            </header>
            <div className="history-placeholder">
              <p>Selecciona una semana anterior para ver su detalle.</p>
              <button type="button" className="link-button">Abrir selector</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
