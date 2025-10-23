export const weeklySummary = {
  totalMinutes: 1650,
  sessions: 32,
  averageMinutesPerSession: 52,
  occupancy: 86,
};

export const weeklyPatients = [
  {
    id: 'p1',
    name: 'Laura Fernández',
    sessions: 5,
    totalMinutes: 300,
    status: 'ok',
    weeks: [
      { label: 'Semana actual', minutes: 300, sessions: 5, status: 'ok' },
    ],
  },
  {
    id: 'p2',
    name: 'Diego Martín',
    sessions: 4,
    totalMinutes: 270,
    status: 'pendiente',
    weeks: [
      { label: 'Semana actual', minutes: 180, sessions: 3, status: 'ok' },
      { label: 'Pendiente', minutes: 90, sessions: 1, status: 'pendiente' },
    ],
  },
  {
    id: 'p3',
    name: 'Sara Ortiz',
    sessions: 3,
    totalMinutes: 180,
    status: 'cancelada',
    weeks: [
      { label: 'Semana actual', minutes: 90, sessions: 1, status: 'ok' },
      { label: 'Cancelada', minutes: 90, sessions: 2, status: 'cancelada' },
    ],
  },
];

export const alerts = [
  {
    id: 'a1',
    severity: 'warning',
    title: 'Sesión cancelada pendiente de reagendar',
    description: 'Paciente Sara Ortiz canceló la sesión del jueves.',
    cta: 'Reprogramar',
  },
  {
    id: 'a2',
    severity: 'info',
    title: 'Hueco libre el viernes a las 11:00',
    description: 'Aprovecha para asignar una sesión adicional.',
    cta: 'Ver disponibilidad',
  },
];
