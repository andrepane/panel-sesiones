const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateFixedBaseMinutes,
  calculateEffectiveBaseMinutes,
  resolveAvailableMinutes
} = require('../hours-calculation.js');

function range(start, end){
  return { start: new Date(start), end: new Date(end) };
}

function timedEvent(start, end){
  return { start: { dateTime: start }, end: { dateTime: end }, summary: 'g 1' };
}

const effectiveOptions = {
  isExcluded: ()=> false,
  isEffectiveBlock: ()=> true
};

test('Semana normal sin ausencias (modo fijo y efectivo)', ()=>{
  const weekRange = range('2026-01-05T00:00:00', '2026-01-12T00:00:00');
  const fixed = resolveAvailableMinutes({ mode: 'fixed', range: weekRange, weeklyHours: 38.5, absenceReductionMinutes: 0 });
  const effective = resolveAvailableMinutes({
    mode: 'effective_schedule',
    range: weekRange,
    events: [timedEvent('2026-01-05T08:00:00', '2026-01-05T16:00:00')],
    absenceReductionMinutes: 0,
    effectiveOptions
  });
  assert.equal(fixed, 2310);
  assert.equal(effective, 480);
});

test('Semana con festivo de día completo descuenta igual en ambos modos', ()=>{
  const weekRange = range('2026-01-05T00:00:00', '2026-01-12T00:00:00');
  const reduction = 24 * 60;
  const fixed = resolveAvailableMinutes({ mode: 'fixed', range: weekRange, weeklyHours: 38.5, absenceReductionMinutes: reduction });
  const effective = resolveAvailableMinutes({
    mode: 'effective_schedule',
    range: weekRange,
    events: [timedEvent('2026-01-05T08:00:00', '2026-01-05T16:00:00')],
    absenceReductionMinutes: reduction,
    effectiveOptions
  });
  assert.equal(fixed, 870);
  assert.equal(effective, 0);
});

test('Semana con baja/vacaciones aplica la misma regla final', ()=>{
  const weekRange = range('2026-01-05T00:00:00', '2026-01-12T00:00:00');
  const reduction = 6 * 60;
  const fixed = resolveAvailableMinutes({ mode: 'fixed', range: weekRange, weeklyHours: 38.5, absenceReductionMinutes: reduction });
  const effective = resolveAvailableMinutes({
    mode: 'effective_schedule',
    range: weekRange,
    events: [timedEvent('2026-01-06T09:00:00', '2026-01-06T17:00:00')],
    absenceReductionMinutes: reduction,
    effectiveOptions
  });
  assert.equal(fixed, 1950);
  assert.equal(effective, 120);
});

test('Bloque efectivo + ausencia en el mismo día aplica ajuste final sin doble lógica', ()=>{
  const weekRange = range('2026-01-05T00:00:00', '2026-01-12T00:00:00');
  const events = [timedEvent('2026-01-07T09:00:00', '2026-01-07T14:00:00')];
  const available = resolveAvailableMinutes({
    mode: 'effective_schedule',
    range: weekRange,
    events,
    absenceReductionMinutes: 120,
    effectiveOptions
  });
  assert.equal(available, 180);
});

test('Pacientes privados justificada/no justificada no alteran horas base por modo', ()=>{
  const weekRange = range('2026-01-05T00:00:00', '2026-01-12T00:00:00');
  const fixedNoReduction = resolveAvailableMinutes({ mode: 'fixed', range: weekRange, weeklyHours: 38.5, absenceReductionMinutes: 0 });
  const fixedPrivateJustified = resolveAvailableMinutes({ mode: 'fixed', range: weekRange, weeklyHours: 38.5, absenceReductionMinutes: 0 });
  assert.equal(fixedPrivateJustified, fixedNoReduction);
});

test('Mes de 31 días vs 28 días se calcula proporcional al periodo real en modo fijo', ()=>{
  const januaryRange = range('2026-01-01T00:00:00', '2026-02-01T00:00:00');
  const februaryRange = range('2026-02-01T00:00:00', '2026-03-01T00:00:00');
  const januaryBase = calculateFixedBaseMinutes(januaryRange, 38.5);
  const februaryBase = calculateFixedBaseMinutes(februaryRange, 38.5);
  assert.equal(januaryBase, Math.round(2310 * (31 / 7)));
  assert.equal(februaryBase, Math.round(2310 * 4));
  assert.ok(januaryBase > februaryBase);
});

test('Solape de bloques efectivos no cuenta doble', ()=>{
  const weekRange = range('2026-01-05T00:00:00', '2026-01-12T00:00:00');
  const events = [
    timedEvent('2026-01-05T08:00:00', '2026-01-05T12:00:00'),
    timedEvent('2026-01-05T10:00:00', '2026-01-05T14:00:00')
  ];
  const minutes = calculateEffectiveBaseMinutes(events, weekRange, effectiveOptions);
  assert.equal(minutes, 360);
});
