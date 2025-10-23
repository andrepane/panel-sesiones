const totalsMemo = new WeakMap();
const patientMemo = new WeakMap();
const centerMemo = new WeakMap();
const dayMemo = new WeakMap();

let compactMode = false;

export function formatDuration(minutes, { compact = false } = {}) {
  if (!Number.isFinite(minutes) || minutes < 0) {
    return '–';
  }
  const hours = minutes / 60;
  const rounded = Math.round(hours * 10) / 10;
  if (!compact) {
    const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `${text} h`;
  }
  const totalMinutes = Math.round(rounded * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = Math.max(0, totalMinutes - h * 60);
  const padded = m.toString().padStart(2, '0');
  return `${h}:${padded} h`;
}

function memoizeWeekTotals(week) {
  if (totalsMemo.has(week)) {
    return totalsMemo.get(week);
  }
  const totalMinutes = week.sessions.reduce((sum, session) => sum + session.minutes, 0);
  const sessionCount = week.sessions.length;
  const averageMinutes = sessionCount > 0 ? totalMinutes / sessionCount : 0;
  const totals = { totalMinutes, sessionCount, averageMinutes };
  totalsMemo.set(week, totals);
  return totals;
}

function memoizePatients(week) {
  if (patientMemo.has(week)) {
    return patientMemo.get(week);
  }
  const summary = Array.from(
    week.sessions.reduce((map, session) => {
      if (!map.has(session.patient)) {
        map.set(session.patient, {
          name: session.patient,
          sessions: 0,
          minutes: 0,
          focusAreas: new Set(),
          items: []
        });
      }
      const entry = map.get(session.patient);
      entry.sessions += 1;
      entry.minutes += session.minutes;
      entry.focusAreas.add(session.focus);
      entry.items.push(session);
      return map;
    }, new Map()).values()
  ).sort((a, b) => b.minutes - a.minutes);
  patientMemo.set(week, summary);
  return summary;
}

function memoizeCenters(week) {
  if (centerMemo.has(week)) {
    return centerMemo.get(week);
  }
  const grouped = Array.from(
    week.sessions.reduce((map, session) => {
      if (!map.has(session.center)) {
        map.set(session.center, { label: session.center, minutes: 0, sessions: 0 });
      }
      const entry = map.get(session.center);
      entry.minutes += session.minutes;
      entry.sessions += 1;
      return map;
    }, new Map()).values()
  ).sort((a, b) => b.minutes - a.minutes);
  centerMemo.set(week, grouped);
  return grouped;
}

function memoizeDays(week) {
  if (dayMemo.has(week)) {
    return dayMemo.get(week);
  }
  const orderedWeekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const grouped = orderedWeekdays
    .map((day) => {
      const daySessions = week.sessions.filter((session) => session.day === day);
      const minutes = daySessions.reduce((sum, session) => sum + session.minutes, 0);
      if (!daySessions.length) return null;
      return {
        label: day,
        minutes,
        sessions: daySessions.length,
        items: daySessions
      };
    })
    .filter(Boolean);
  dayMemo.set(week, grouped);
  return grouped;
}

function renderWeek(week) {
  const { totalMinutes, sessionCount, averageMinutes } = memoizeWeekTotals(week);
  const weekRangeLabel = document.querySelector('#week-range-label');
  weekRangeLabel.textContent = week.rangeLabel;

  const kpis = document.querySelector('#weekly-kpis');
  kpis.innerHTML = '';
  const metrics = [
    { label: 'Horas totales', minutes: totalMinutes },
    { label: 'Nº de sesiones', value: sessionCount.toString() },
    { label: 'Promedio h/sesión', minutes: averageMinutes }
  ];

  metrics.forEach((metric) => {
    const kpi = document.createElement('div');
    kpi.className = 'kpi';

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = metric.label;

    const value = document.createElement('span');
    value.className = 'value';
    if (typeof metric.minutes === 'number') {
      value.textContent = formatDuration(metric.minutes, { compact: compactMode });
    } else {
      value.textContent = metric.value;
    }

    kpi.append(label, value);
    kpis.appendChild(kpi);
  });

  const centers = memoizeCenters(week);
  renderDetailList('#center-breakdown', centers, 'centro');

  const days = memoizeDays(week);
  renderDetailList('#day-breakdown', days, 'día', true);
}

function renderDetailList(selector, items, typeLabel, includeItems = false) {
  const list = document.querySelector(selector);
  list.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');

    const left = document.createElement('div');
    left.className = 'session-detail';
    const title = document.createElement('strong');
    title.textContent = item.label;
    left.appendChild(title);

    if (includeItems && item.items) {
      const subtitle = document.createElement('p');
      const sessionsLabel = item.items
        .map((session) => `${session.time} · ${session.patient}`)
        .join('\n');
      subtitle.textContent = sessionsLabel;
      left.appendChild(subtitle);
    } else {
      const subtitle = document.createElement('p');
      subtitle.textContent = `${item.sessions} sesiones en este ${typeLabel}`;
      left.appendChild(subtitle);
    }

    const right = document.createElement('span');
    right.className = 'meta';
    const durationText = formatDuration(item.minutes, { compact: compactMode });
    right.textContent = `${durationText} (${item.minutes} min)`;

    li.append(left, right);
    list.appendChild(li);
  });
}

function renderPatients(week) {
  const container = document.querySelector('#patients-list');
  container.innerHTML = '';
  const patients = memoizePatients(week);
  patients.forEach((patient, index) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'patient-row';
    row.setAttribute('role', 'row');
    row.setAttribute('aria-expanded', 'false');
    row.dataset.accordionTarget = `patient-${index}`;

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = patient.name;

    const sessions = document.createElement('span');
    sessions.className = 'sessions';
    sessions.textContent = patient.sessions.toString();

    const hours = document.createElement('span');
    hours.className = 'hours';
    hours.textContent = formatDuration(patient.minutes, { compact: compactMode });

    row.append(name, sessions, hours);

    const detail = document.createElement('div');
    detail.className = 'accordion-content';
    detail.id = `patient-${index}`;
    detail.hidden = true;

    const summary = document.createElement('p');
    const focusAreas = Array.from(patient.focusAreas).join(', ');
    summary.innerHTML = `<strong>Enfoques trabajados:</strong> ${focusAreas || '—'}`;

    const list = document.createElement('ul');
    list.className = 'detail-list';
    patient.items.forEach((session) => {
      const item = document.createElement('li');
      const info = document.createElement('div');
      info.className = 'session-detail';
      const title = document.createElement('strong');
      title.textContent = `${session.day} · ${session.time}`;
      const desc = document.createElement('p');
      desc.textContent = session.focus;
      info.append(title, desc);

      const meta = document.createElement('span');
      meta.className = 'meta';
      const durationText = formatDuration(session.minutes, { compact: compactMode });
      meta.textContent = `${durationText} (${session.minutes} min)`;

      item.append(info, meta);
      list.appendChild(item);
    });

    detail.append(summary, list);

    container.append(row, detail);
  });
}

function renderAlerts(alerts) {
  const panel = document.querySelector('#alerts-panel');
  const list = document.querySelector('#alerts-list');
  list.innerHTML = '';
  if (!alerts.length) {
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');
  alerts.forEach((alert) => {
    const item = document.createElement('li');
    item.dataset.level = alert.level;
    const main = document.createElement('div');
    main.className = 'session-detail';
    const title = document.createElement('strong');
    title.textContent = alert.title;
    const desc = document.createElement('p');
    desc.textContent = alert.description;
    main.append(title, desc);

    const meta = document.createElement('span');
    meta.className = 'meta';
    if (alert.minutes) {
      const durationText = formatDuration(alert.minutes, { compact: compactMode });
      meta.textContent = `${durationText} (${alert.minutes} min)`;
    } else {
      meta.textContent = alert.severityLabel;
    }

    item.append(main, meta);
    list.appendChild(item);
  });
}

function setupAccordion(root = document) {
  root.querySelectorAll('[data-accordion] .accordion-trigger').forEach((trigger) => {
    if (trigger.dataset.bound === 'true') return;
    trigger.dataset.bound = 'true';
    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!expanded));
      const content = trigger.nextElementSibling;
      if (content) {
        content.hidden = expanded;
      }
    });
  });

  root.querySelectorAll('.patient-row').forEach((row) => {
    if (row.dataset.bound === 'true') return;
    row.dataset.bound = 'true';
    row.addEventListener('click', () => {
      const targetId = row.dataset.accordionTarget;
      const detail = document.getElementById(targetId);
      const expanded = row.getAttribute('aria-expanded') === 'true';
      row.setAttribute('aria-expanded', String(!expanded));
      if (detail) {
        detail.hidden = expanded;
      }
    });
  });
}

function renderDashboard(week) {
  renderWeek(week);
  renderPatients(week);
  renderAlerts(week.alerts);
  setupAccordion();
}

const formatToggle = document.querySelector('#format-toggle');
formatToggle.addEventListener('click', () => {
  compactMode = !compactMode;
  formatToggle.setAttribute('aria-pressed', String(compactMode));
  formatToggle.textContent = compactMode ? 'Formato 1:30 h' : 'Formato 1.5 h';
  renderDashboard(sampleWeek);
});

const sampleWeek = {
  rangeLabel: 'Semana del 15 al 21 de abril',
  sessions: [
    {
      patient: 'Ana López',
      center: 'CAIT Gines',
      day: 'Lunes',
      time: '09:00',
      minutes: 45,
      focus: 'Motricidad fina',
      status: 'Realizada'
    },
    {
      patient: 'Ana López',
      center: 'CAIT Gines',
      day: 'Miércoles',
      time: '09:30',
      minutes: 45,
      focus: 'Planificación motora',
      status: 'Realizada'
    },
    {
      patient: 'Ana López',
      center: 'CAIT Gines',
      day: 'Viernes',
      time: '10:00',
      minutes: 45,
      focus: 'Coordinación bilateral',
      status: 'Realizada'
    },
    {
      patient: 'Lucía Martín',
      center: 'CAIT Bormujos',
      day: 'Lunes',
      time: '11:00',
      minutes: 60,
      focus: 'Integración sensorial',
      status: 'Realizada'
    },
    {
      patient: 'Lucía Martín',
      center: 'CAIT Bormujos',
      day: 'Miércoles',
      time: '11:30',
      minutes: 60,
      focus: 'Regulación emocional',
      status: 'Realizada'
    },
    {
      patient: 'Lucía Martín',
      center: 'CAIT Bormujos',
      day: 'Jueves',
      time: '11:30',
      minutes: 60,
      focus: 'Autoorganización',
      status: 'Realizada'
    },
    {
      patient: 'Diego Pérez',
      center: 'Privado',
      day: 'Martes',
      time: '16:00',
      minutes: 45,
      focus: 'Esquema corporal',
      status: 'Realizada'
    },
    {
      patient: 'Diego Pérez',
      center: 'Privado',
      day: 'Jueves',
      time: '16:30',
      minutes: 45,
      focus: 'Coordinación ojo-mano',
      status: 'Realizada'
    },
    {
      patient: 'Diego Pérez',
      center: 'Privado',
      day: 'Viernes',
      time: '16:30',
      minutes: 45,
      focus: 'Regulación postural',
      status: 'Realizada'
    },
    {
      patient: 'Sara Campos',
      center: 'CAIT Gines',
      day: 'Martes',
      time: '10:00',
      minutes: 60,
      focus: 'Planificación motora',
      status: 'Realizada'
    },
    {
      patient: 'Sara Campos',
      center: 'CAIT Gines',
      day: 'Jueves',
      time: '10:30',
      minutes: 60,
      focus: 'Habilidades visomotoras',
      status: 'Realizada'
    },
    {
      patient: 'Sara Campos',
      center: 'CAIT Gines',
      day: 'Viernes',
      time: '09:30',
      minutes: 60,
      focus: 'Atención sostenida',
      status: 'Realizada'
    },
    {
      patient: 'Hugo Vidal',
      center: 'CAIT Bormujos',
      day: 'Martes',
      time: '12:30',
      minutes: 45,
      focus: 'Motricidad global',
      status: 'Realizada'
    },
    {
      patient: 'Hugo Vidal',
      center: 'CAIT Bormujos',
      day: 'Jueves',
      time: '12:30',
      minutes: 45,
      focus: 'Propiocepción',
      status: 'Realizada'
    },
    {
      patient: 'Claudia Ruiz',
      center: 'CAIT Gines',
      day: 'Martes',
      time: '09:00',
      minutes: 45,
      focus: 'Planificación motora',
      status: 'Realizada'
    },
    {
      patient: 'Claudia Ruiz',
      center: 'CAIT Gines',
      day: 'Jueves',
      time: '09:30',
      minutes: 45,
      focus: 'Integración sensorial',
      status: 'Realizada'
    },
    {
      patient: 'Claudia Ruiz',
      center: 'CAIT Gines',
      day: 'Viernes',
      time: '11:00',
      minutes: 45,
      focus: 'Regulación postural',
      status: 'Realizada'
    }
  ],
  alerts: [
    {
      level: 'alta',
      title: 'Confirmar sesión de seguimiento con Sara Campos',
      description: 'Última sesión finalizó con derivación pendiente a logopedia.',
      minutes: 60
    },
    {
      level: 'media',
      title: 'Revisar objetivos de Diego Pérez',
      description: 'Registrar observaciones sobre la progresión en coordinación ojo-mano.',
      minutes: 45
    }
  ]
};

renderDashboard(sampleWeek);

// Ejemplos de uso en consola
console.log('Ejemplo formato largo:', formatDuration(90));
console.log('Ejemplo formato compacto:', formatDuration(90, { compact: true }));

window.formatDuration = formatDuration;
window.renderDashboard = renderDashboard;
