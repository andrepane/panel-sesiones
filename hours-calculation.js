(function(root, factory){
  if(typeof module === 'object' && module.exports){
    module.exports = factory();
    return;
  }
  root.HoursCalculation = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  const MS_IN_DAY = 24 * 60 * 60 * 1000;

  function clampRange(range){
    if(!range || !range.start || !range.end) return null;
    const start = new Date(range.start);
    const end = new Date(range.end);
    if(Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
    return { start, end };
  }

  function getRangeSpanDays(range){
    const normalized = clampRange(range);
    if(!normalized) return 0;
    return (normalized.end.getTime() - normalized.start.getTime()) / MS_IN_DAY;
  }

  function calculateFixedBaseMinutes(range, weeklyHours){
    const spanDays = getRangeSpanDays(range);
    if(!Number.isFinite(spanDays) || spanDays <= 0) return 0;
    const hours = Number(weeklyHours);
    if(!Number.isFinite(hours) || hours <= 0) return 0;

    // Fórmula proporcional: horasSemanales * (díasPeriodo / 7).
    // Evita el sesgo artificial de "x4 semanas" en meses de 30/31 días
    // y mantiene coherencia entre semana, mes y año.
    const weeklyMinutes = hours * 60;
    return Math.round(weeklyMinutes * (spanDays / 7));
  }

  function mergeIntervals(intervals){
    if(!Array.isArray(intervals) || intervals.length === 0) return 0;
    const ordered = [...intervals].sort((a, b)=> a[0] - b[0]);
    let total = 0;
    let [currentStart, currentEnd] = ordered[0];

    for(let i = 1; i < ordered.length; i += 1){
      const [start, end] = ordered[i];
      if(start <= currentEnd){
        currentEnd = Math.max(currentEnd, end);
        continue;
      }
      total += currentEnd - currentStart;
      currentStart = start;
      currentEnd = end;
    }

    total += currentEnd - currentStart;
    return total;
  }

  function calculateEffectiveBaseMinutes(events, range, options = {}){
    if(!Array.isArray(events) || events.length === 0) return 0;
    const normalized = clampRange(range);
    if(!normalized) return 0;
    const isExcluded = options.isExcluded || (()=> false);
    const isEffectiveBlock = options.isEffectiveBlock || (()=> false);
    const getStartMs = options.getStartMs || ((ev)=> new Date(ev?.start?.dateTime || (ev?.start?.date + 'T00:00:00')).getTime());
    const getEndMs = options.getEndMs || ((ev)=> new Date(ev?.end?.dateTime || (ev?.end?.date + 'T23:59:59')).getTime());

    const rangeStart = normalized.start.getTime();
    const rangeEnd = normalized.end.getTime();
    const intervals = [];

    events.forEach((ev)=>{
      if(isExcluded(ev)) return;
      if(!isEffectiveBlock(ev)) return;
      const startMs = getStartMs(ev);
      const endMs = getEndMs(ev);
      if(!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return;
      const clippedStart = Math.max(startMs, rangeStart);
      const clippedEnd = Math.min(endMs, rangeEnd);
      if(clippedEnd <= clippedStart) return;
      intervals.push([clippedStart, clippedEnd]);
    });

    if(!intervals.length) return 0;
    return Math.round(mergeIntervals(intervals) / 60000);
  }

  function applyCommonAvailabilityAdjustments(baseMinutes, adjustments = {}){
    const normalizedBase = Number(baseMinutes);
    if(!Number.isFinite(normalizedBase) || normalizedBase <= 0) return 0;
    const absenceReductionMinutes = Number(adjustments.absenceReductionMinutes || 0);
    const safeReduction = Number.isFinite(absenceReductionMinutes) ? Math.max(0, absenceReductionMinutes) : 0;
    return Math.max(0, normalizedBase - safeReduction);
  }

  function resolveAvailableMinutes(params = {}){
    const mode = params.mode === 'effective_schedule' ? 'effective_schedule' : 'fixed';
    const events = Array.isArray(params.events) ? params.events : [];
    const range = params.range;
    const weeklyHours = params.weeklyHours;
    const absenceReductionMinutes = Number(params.absenceReductionMinutes || 0);

    const baseMinutes = mode === 'effective_schedule'
      ? calculateEffectiveBaseMinutes(events, range, params.effectiveOptions || {})
      : calculateFixedBaseMinutes(range, weeklyHours);

    return applyCommonAvailabilityAdjustments(baseMinutes, { absenceReductionMinutes });
  }

  return {
    calculateFixedBaseMinutes,
    calculateEffectiveBaseMinutes,
    applyCommonAvailabilityAdjustments,
    resolveAvailableMinutes,
    getRangeSpanDays
  };
});
