// ======== UTILIDADES DE TIEMPO (Semana Lunes-Domingo en Europe/Madrid) ========
const TZ = 'Europe/Madrid';
const fmtDate = (d)=> d.toLocaleDateString('es-ES', { timeZone: TZ });
const fmtTime = (d)=> d.toLocaleTimeString('es-ES', { timeZone: TZ, hour:'2-digit', minute:'2-digit' });
const fmtMonthYear = (d)=> d.toLocaleDateString('es-ES', { timeZone: TZ, month: 'long', year: 'numeric' });
const fmtYear = (d)=> d.toLocaleDateString('es-ES', { timeZone: TZ, year: 'numeric' });

function getWeekRange(baseDate=new Date()){
  const d = new Date(baseDate);
  const day = (d.getDay() + 6) % 7; // 0..6 con 0 = lunes
  const start = new Date(d);
  start.setHours(0,0,0,0);
  start.setDate(d.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return {start, end};
}

function getMonthRange(baseDate=new Date()){
  const d = new Date(baseDate);
  d.setHours(0,0,0,0);
  d.setDate(1);
  const start = new Date(d);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return {start, end};
}

function getYearRange(baseDate=new Date()){
  const d = new Date(baseDate);
  d.setHours(0,0,0,0);
  d.setMonth(0, 1);
  const start = new Date(d);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  return {start, end};
}

// ======== ESTADO Y PERSISTENCIA ========
const $ = (sel)=> document.querySelector(sel);

const CLIENT_ID = '103921745137-e4qjpo069jrkjs77msr2gp6ga23fsfhc.apps.googleusercontent.com';

function setAccentForView(view){
  const map = { resumenes:'#22c55e', semana:'#22c55e', mes:'#3b82f6', ano:'#8b5cf6' };
  const color = map[view] || '#7aa2ff';
  document.documentElement.style.setProperty('--accent', color);
}

function setPercentColor(el, val){
  if(!el) return;
  el.classList.remove('is-low','is-mid','is-high');
  if(!Number.isFinite(val)) return;
  if(val < 50){ el.classList.add('is-low'); }
  else if(val < 80){ el.classList.add('is-mid'); }
  else{ el.classList.add('is-high'); }
}

const storedHoursValue = localStorage.getItem('hoursAvailable');
const storedMinutesValue = localStorage.getItem('minutesAvailable');
const storedHoursMode = localStorage.getItem('hoursCalculationMode');
let initialWeeklyMinutes = 2310;
if(storedHoursValue !== null){
  const parsed = Number(storedHoursValue);
  if(!Number.isNaN(parsed)){
    initialWeeklyMinutes = parsed * 60;
  }
}else if(storedMinutesValue !== null){
  const parsed = Number(storedMinutesValue);
  if(!Number.isNaN(parsed)){
    initialWeeklyMinutes = parsed;
  }
}

const cfg = {
  minutesAvailable: initialWeeklyMinutes,
  hoursAvailable: initialWeeklyMinutes / 60,
  hoursCalculationMode: storedHoursMode === 'effective_schedule' ? 'effective_schedule' : 'fixed',
  rules: JSON.parse(localStorage.getItem('rules') || '{}')
};

if(!Number.isFinite(cfg.hoursAvailable) || cfg.hoursAvailable <= 0){
  cfg.hoursAvailable = 38.5;
  cfg.minutesAvailable = cfg.hoursAvailable * 60;
}

const storedWeekStartIso = localStorage.getItem('weekStartISO') || '';

const weekPicker = $('#week-picker');
const weekDadasEl = $('#stat-dadas');
const weekAusenciasEl = $('#stat-ausencias');
const weekProgramadasEl = $('#stat-programadas');
const weekEnCursoEl = $('#stat-en-curso');
const weekGinesEl = $('#stat-gines');
const weekBormujosEl = $('#stat-bormujos');
const weekPrivadoEl = $('#stat-privado');
const weekPrivadoJustEl = $('#stat-privado-just');
const weekPrivadoNoJustEl = $('#stat-privado-nojust');
const weekTotalEl = $('#stat-week-total');
const weekPctEl = $('#stat-week-pct');
const weekPctDeltaEl = $('#stat-week-delta');
const weekShortfallEl = $('#stat-week-shortfall');
const weekForecastEl = $('#stat-week-forecast');
const weekEntornoEl = $('#stat-week-entorno');
const weekFamiliaEl = $('#stat-week-familia');
const weekRecuperacionEl = $('#stat-week-recuperacion');
const weekHoursLabelEl = (()=>{
  if(!weekPctEl) return null;
  const stat = weekPctEl.closest('.stat');
  if(!stat) return null;
  const candidates = stat.querySelectorAll('.stat-subtext');
  for(const el of candidates){
    if(el.id !== 'stat-week-shortfall') return el;
  }
  return null;
})();
if(weekHoursLabelEl){ weekHoursLabelEl.textContent = '—'; }
const monthDadasEl = $('#stat-month-dadas');
const monthAusenciasEl = $('#stat-month-ausencias');
const monthPrivadoAbsEl = $('#stat-month-privado-abs');
const monthProgramadasEl = $('#stat-month-programadas');
const monthPctEl = $('#stat-month-pct');
const monthPctDeltaEl = $('#stat-month-delta');
const monthTotalEl = $('#stat-month-total');
const monthForecastEl = $('#stat-month-forecast');
const monthWeekMissingEl = $('#stat-month-week-missing');
const monthMissingEl = $('#stat-month-missing');
const monthLabelEl = $('#month-label');
const monthHoursLabelEl = $('#month-hours-label');
const yearDadasEl = $('#stat-year-dadas');
const yearAusenciasEl = $('#stat-year-ausencias');
const yearPrivadoAbsEl = $('#stat-year-privado-abs');
const yearProgramadasEl = $('#stat-year-programadas');
const yearPctEl = $('#stat-year-pct');
const yearPctDeltaEl = $('#stat-year-delta');
const yearShortfallEl = $('#stat-year-shortfall');
const yearForecastEl = $('#stat-year-forecast');
const yearLabelEl = $('#year-label');
const yearHoursLabelEl = $('#year-hours-label');
const loadingIndicatorEl = $('#loading-indicator');
const statusFiltersEl = $('#status-filters');
const centerFiltersEl = $('#center-filters');
const hoursInputEl = $('#cfg-hours');
const hoursModeEl = $('#cfg-hours-mode');
const exportCsvBtn = $('#export-csv');
const printViewBtn = $('#print-view');
const primaryTabButtons = document.querySelectorAll('nav.view-tabs[data-role="primary"] .tab');
const viewPanels = document.querySelectorAll('.view-panel');
const summaryTabButtons = document.querySelectorAll('.summary-tabs .tab');
const summaryPanels = document.querySelectorAll('.kpi-panel');
const quickReportBtn = $('#quick-report');
const gcStatusEl = $('#gc-status');
const DEFAULT_VIEW = 'resumenes';
let currentView = DEFAULT_VIEW;
const SUMMARY_DEFAULT_VIEW = 'semana';
let currentSummaryView = SUMMARY_DEFAULT_VIEW;

function setGcStatus(state){
  if(!gcStatusEl) return;
  const map = {
    connected: { text: 'Conectado', className: 'ok' },
    retrying: { text: 'Reintentando…', className: 'warn' },
    disconnected: { text: 'Sin conexión', className: 'muted' }
  };
  const cfgEntry = map[state] || map.disconnected;
  gcStatusEl.textContent = cfgEntry.text;
  gcStatusEl.classList.remove('ok','warn','muted');
  gcStatusEl.classList.add(cfgEntry.className);
}

const FALLBACK_SESSION_REGEX = /^\*?\s*(\d{3,6})\s+(.+?)\s*\(([BGP])\)\s*$/i;
const CLASSIFICATION_UTILS = globalThis.ClassificationUtils || {};
const normalizeTitle = CLASSIFICATION_UTILS.normalizeTitle || ((value)=> String(value || '').trim());
const parseBloqueHorarioTitle = CLASSIFICATION_UTILS.parseBloqueHorarioTitle || (()=> null);
const UNIVERSAL_BLOCK_PATTERN = CLASSIFICATION_UTILS.UNIVERSAL_BLOCK_PATTERN || '^(G|GIN|GINES|B|BORMUJOS)\\s*(?:SALA\\s*)?(\\d{1,2})$';

const DEFAULT_RULES = {
  centros: { gines:["(g)"], bormujos:["(b)"], privado:["(p)"] },
  pattern_sesion: FALLBACK_SESSION_REGEX.source,
  otros_excluir_totalmente: ["^G\s*:?\s*\d+$","^B\s*:?\s*\d+$","^ENT\s*[BG]\s*:?\s*\d+$","^[BG]S\s*:?\s*\d+$"],
  bloques_horario: [UNIVERSAL_BLOCK_PATTERN],
  otros_keywords: ["firma","comida","coordinación","reunión","formación","llamada","administrativo","battelle"],
  ausencias_descuentan: ["festivo","vacaciones","baja"],
  ausencias_justificadas: ["justificada","justificación","justif","justific"]
};

const DEFAULT_SESSION_REGEX = (()=>{
  try{
    return buildRegex(DEFAULT_RULES.pattern_sesion);
  }catch(err){
    console.error('pattern_sesion por defecto inválido, usando comodín', err);
    return FALLBACK_SESSION_REGEX;
  }
})();

const STATUS_FILTER_MAP = {
  dada: ['dada'],
  programada: ['programada', 'en_curso'],
  ausencia: ['ausencia'],
  otro: ['otro']
};
const CENTER_FILTER_KEYS = ['gines','bormujos','privado'];
let activeStatusFilters = new Set(['dada','ausencia']);
let activeCenterFilters = new Set(CENTER_FILTER_KEYS);
let processedWeekEvents = [];
let filteredWeekEvents = [];
let rawWeekEvents = [];
let loadingCounter = 0;
let weeklyNarrativeCounters = createEmptyNarrativeCounters();
let filteredNarrativeCounters = createEmptyNarrativeCounters();

function activateView(viewKey=DEFAULT_VIEW){
  if(!viewPanels.length) return;
  const panels = Array.from(viewPanels);
  const validView = panels.some((panel)=> panel.dataset.view === viewKey) ? viewKey : DEFAULT_VIEW;

  primaryTabButtons.forEach((btn)=>{
    const isActive = btn.dataset.view === validView;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.setAttribute('tabindex', isActive ? '0' : '-1');
  });

  panels.forEach((panel)=>{
    const isActive = panel.dataset.view === validView;
    panel.classList.toggle('active', isActive);
    if(isActive){
      panel.removeAttribute('aria-hidden');
    }else{
      panel.setAttribute('aria-hidden', 'true');
    }
  });

  currentView = validView;
  try{
    localStorage.setItem('activeView', validView);
  }catch(err){
    console.warn('No se pudo guardar la vista activa', err);
  }
}

if(primaryTabButtons.length){
  const storedView = localStorage.getItem('activeView');
  activateView(storedView || DEFAULT_VIEW);
  primaryTabButtons.forEach((btn)=>{
    btn.addEventListener('click', ()=> activateView(btn.dataset.view));
  });
}

function activateSummaryView(viewKey=SUMMARY_DEFAULT_VIEW){
  if(!summaryPanels.length){
    currentSummaryView = viewKey;
    setAccentForView(viewKey);
    return;
  }
  const panels = Array.from(summaryPanels);
  const validView = panels.some((panel)=> panel.dataset.view === viewKey) ? viewKey : SUMMARY_DEFAULT_VIEW;

  summaryTabButtons.forEach((btn)=>{
    const isActive = btn.dataset.view === validView;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.setAttribute('tabindex', isActive ? '0' : '-1');
  });

  panels.forEach((panel)=>{
    const isActive = panel.dataset.view === validView;
    panel.classList.toggle('active', isActive);
    panel.classList.toggle('kpi-accent', isActive);
    if(isActive){
      panel.removeAttribute('aria-hidden');
    }else{
      panel.setAttribute('aria-hidden', 'true');
    }
  });

  currentSummaryView = validView;
  setAccentForView(validView);
  try{
    localStorage.setItem('activeSummaryView', validView);
  }catch(err){
    console.warn('No se pudo guardar la vista de resumen activa', err);
  }
}

if(summaryTabButtons.length){
  const storedSummaryView = localStorage.getItem('activeSummaryView');
  activateSummaryView(storedSummaryView || SUMMARY_DEFAULT_VIEW);
  summaryTabButtons.forEach((btn)=>{
    btn.addEventListener('click', ()=> activateSummaryView(btn.dataset.view));
  });
}else{
  setAccentForView(SUMMARY_DEFAULT_VIEW);
}

setGcStatus('disconnected');

function showLoading(){
  loadingCounter++;
  if(loadingIndicatorEl){ loadingIndicatorEl.classList.remove('hidden'); }
}

function hideLoading(){
  loadingCounter = Math.max(0, loadingCounter - 1);
  if(loadingCounter === 0 && loadingIndicatorEl){ loadingIndicatorEl.classList.add('hidden'); }
}

function formatDateInputValue(date){
  const d = new Date(date);
  if(Number.isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function parseDateInputValue(value){
  if(!value) return null;
  const parts = value.split('-').map(Number);
  if(parts.length !== 3) return null;
  const [year, month, day] = parts;
  if(!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function dateKeyFromDate(date){
  if(!date) return '';
  return date.toLocaleDateString('sv-SE', { timeZone: TZ });
}

function dateKeysFromRange(startDate, endDate){
  if(!startDate) return [];
  const start = parseDateInputValue(startDate);
  if(!start) return [];
  const end = parseDateInputValue(endDate);
  const endDateValue = end || new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const keys = [];
  const cursor = new Date(start);
  while(cursor < endDateValue){
    keys.push(formatDateInputValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

function formatMonthRangeText(range){
  const end = new Date(range.end - 1);
  return `Mes de ${fmtMonthYear(range.start)} (${fmtDate(range.start)} - ${fmtDate(end)})`;
}

function formatYearRangeText(range){
  const end = new Date(range.end - 1);
  return `Año ${fmtYear(range.start)} (${fmtDate(range.start)} - ${fmtDate(end)})`;
}

const MINUTES_PER_SESSION = 45;
const WEEK_H = 38.5;
const MONTH_H = 154;
const YEAR_H = WEEK_H * 52;
const PRODUCTIVITY_TARGET_PERCENT = 80;

function resolveConfiguredWeekHours(){
  if(typeof cfg !== 'undefined' && Number.isFinite(cfg.hoursAvailable) && cfg.hoursAvailable > 0){
    return cfg.hoursAvailable;
  }
  return WEEK_H;
}

function resolveHoursCalculationMode(){
  if(cfg?.hoursCalculationMode === 'effective_schedule') return 'effective_schedule';
  return 'fixed';
}

function updateHoursModeUI(){
  const mode = resolveHoursCalculationMode();
  if(hoursModeEl){
    hoursModeEl.value = mode;
  }
  if(hoursInputEl){
    const isFixed = mode === 'fixed';
    hoursInputEl.disabled = !isFixed;
    hoursInputEl.setAttribute('aria-disabled', isFixed ? 'false' : 'true');
  }
}

function isAbsenceDiscountEvent(ev){
  const keywords = cfg.rules.ausencias_descuentan || [];
  if(!keywords.length) return false;
  return matchesAnyRegex(textFromEvent(ev), keywords);
}

function isPrivateAbsenceJustified(ev){
  const keywords = cfg.rules.ausencias_justificadas || [];
  if(!keywords.length) return false;
  const text = textFromEvent(ev);
  if(matchesAnyRegex(text, ['no\\s+justificad'])) return false;
  return matchesAnyRegex(text, keywords);
}

function calculateAbsenceReductionMinutes(events, range){
  if(!range || !Array.isArray(events) || events.length === 0) return 0;
  const rangeStart = parseDateInputValue(formatDateInputValue(range.start));
  const rangeEnd = parseDateInputValue(formatDateInputValue(range.end));
  const isKeyInRange = (key)=>{
    if(!rangeStart || !rangeEnd) return true;
    const date = parseDateInputValue(key);
    if(!date) return false;
    return date >= rangeStart && date < rangeEnd;
  };

  let total = 0;
  events.forEach((ev)=>{
    if(isExcluirTotal(ev)) return;
    if(!isAbsenceDiscountEvent(ev)) return;
    if(ev.start?.date){
      const keys = dateKeysFromRange(ev.start.date, ev.end?.date);
      keys.forEach((key)=>{
        if(!isKeyInRange(key)) return;
        total += 24 * 60;
      });
      return;
    }
    const start = new Date(ev.start.dateTime || (ev.start.date + 'T00:00:00'));
    if(Number.isNaN(start.getTime())) return;
    const key = dateKeyFromDate(start);
    if(!isKeyInRange(key)) return;
    const mins = durationMinutes(ev);
    if(!Number.isFinite(mins) || mins <= 0) return;
    total += mins;
  });
  return total;
}

function calculateEffectiveScheduleMinutes(events, range){
  if(!range || !Array.isArray(events) || events.length === 0) return 0;
  const rangeStart = range.start.getTime();
  const rangeEnd = range.end.getTime();
  if(!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd) || rangeEnd <= rangeStart){
    return 0;
  }

  const intervals = [];
  events.forEach((ev)=>{
    if(isExcluirTotal(ev)) return;
    if(!isEffectiveScheduleBlock(ev)) return;
    const start = new Date(ev.start?.dateTime || (ev.start?.date + 'T00:00:00'));
    const end = new Date(ev.end?.dateTime || (ev.end?.date + 'T23:59:59'));
    const startMs = start.getTime();
    const endMs = end.getTime();
    if(!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return;
    const clippedStart = Math.max(startMs, rangeStart);
    const clippedEnd = Math.min(endMs, rangeEnd);
    if(clippedEnd <= clippedStart) return;
    intervals.push([clippedStart, clippedEnd]);
  });

  if(!intervals.length) return 0;
  intervals.sort((a, b)=> a[0] - b[0]);

  let totalMs = 0;
  let [currentStart, currentEnd] = intervals[0];
  for(let i = 1; i < intervals.length; i += 1){
    const [start, end] = intervals[i];
    if(start <= currentEnd){
      currentEnd = Math.max(currentEnd, end);
      continue;
    }
    totalMs += currentEnd - currentStart;
    currentStart = start;
    currentEnd = end;
  }
  totalMs += currentEnd - currentStart;
  return Math.round(totalMs / 60000);
}

function minutesAvailableForRange(range, events){
  if(!range) return 0;
  const mode = resolveHoursCalculationMode();
  let baseMinutes = 0;
  if(mode === 'effective_schedule'){
    baseMinutes = calculateEffectiveScheduleMinutes(events, range);
  }else{
    const ms = range.end - range.start;
    const day = 24 * 60 * 60 * 1000;
    const min = (h)=> Math.round(h * 60);
    const weekHours = resolveConfiguredWeekHours();
    const monthHours = weekHours * 4;
    const yearHours = weekHours * 52;
    baseMinutes = min(weekHours);
    if(ms >= 350 * day) baseMinutes = min(yearHours);
    else if(ms >= 27 * day) baseMinutes = min(monthHours);
  }

  if(!events) return baseMinutes;
  const reduction = calculateAbsenceReductionMinutes(events, range);
  return Math.max(0, baseMinutes - reduction);
}

function resolveAvailableMinutes(){
  return minutesAvailableForRange(...arguments);
}

function formatPercent(value){
  if(!Number.isFinite(value) || value < 0){
    return '–';
  }
  const fixed = value.toFixed(1);
  return `${fixed.replace(/\.0$/, '')}%`;
}

function formatPrivateAbsenceSummary(summary){
  const justified = Number(summary?.privadoAusenciasJustificadas ?? 0);
  const unjustified = Number(summary?.privadoAusenciasNoJustificadas ?? 0);
  if(!Number.isFinite(justified) || !Number.isFinite(unjustified)){
    return '–';
  }
  return `${justified} / ${unjustified}`;
}

function calculateProductivityPercent(summary, availableMinutes){
  if(!summary) return null;
  const available = Number(availableMinutes);
  if(!Number.isFinite(available) || available <= 0) return null;
  const deliveredMinutes = Number(summary.sessionMinutes || 0);
  return (deliveredMinutes / available) * 100;
}

function calculateForecastPercent(summary, availableMinutes){
  if(!summary) return null;
  const available = Number(availableMinutes);
  if(!Number.isFinite(available) || available <= 0) return null;
  const deliveredMinutes = Number(summary.sessionMinutes || 0);
  const scheduledMinutes = Number(summary.scheduledSessionMinutes || 0);
  return ((deliveredMinutes + scheduledMinutes) / available) * 100;
}

function calculateSessionsShortfall(summary, availableMinutes, targetPercent = PRODUCTIVITY_TARGET_PERCENT){
  if(!summary) return null;
  const available = Number(availableMinutes);
  if(!Number.isFinite(available) || available <= 0) return null;
  const deliveredMinutes = Number(summary.sessionMinutes || 0);
  const targetMinutes = (targetPercent / 100) * available;
  const missingMinutes = Math.max(0, targetMinutes - deliveredMinutes);
  if(missingMinutes <= 0) return 0;
  return Math.ceil(missingMinutes / MINUTES_PER_SESSION);
}

function buildPeriodKey(view, referenceDate){
  if(!referenceDate) return null;
  const base = new Date(referenceDate);
  if(Number.isNaN(base.getTime())) return null;
  switch(view){
    case 'semana':{
      const { start } = getWeekRange(base);
      return `wk-${start.toISOString().slice(0, 10)}`;
    }
    case 'mes':{
      const { start } = getMonthRange(base);
      const year = start.getFullYear();
      const month = String(start.getMonth() + 1).padStart(2, '0');
      return `mo-${year}-${month}`;
    }
    case 'ano':{
      const { start } = getYearRange(base);
      return `yr-${start.getFullYear()}`;
    }
    default:
      return null;
  }
}

function getPreviousPeriodKey(view, referenceDate){
  if(!referenceDate) return null;
  const base = new Date(referenceDate);
  if(Number.isNaN(base.getTime())) return null;
  switch(view){
    case 'semana':{
      const prev = new Date(base);
      prev.setDate(prev.getDate() - 7);
      return buildPeriodKey('semana', prev);
    }
    case 'mes':{
      const prev = new Date(base);
      prev.setMonth(prev.getMonth() - 1);
      return buildPeriodKey('mes', prev);
    }
    case 'ano':{
      const prev = new Date(base);
      prev.setFullYear(prev.getFullYear() - 1);
      return buildPeriodKey('ano', prev);
    }
    default:
      return null;
  }
}

function readStoredPercent(key){
  if(!key) return null;
  try{
    const raw = localStorage.getItem(key);
    if(raw == null) return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  }catch(err){
    console.warn('No se pudo leer el histórico de productividad', err);
    return null;
  }
}

function storePercentValue(key, value){
  if(!key || !Number.isFinite(value)) return;
  try{
    localStorage.setItem(key, String(value));
  }catch(err){
    console.warn('No se pudo guardar el histórico de productividad', err);
  }
}

function clearPercentIndicator(element, deltaEl){
  if(!element) return;
  element.classList.remove('is-low','is-mid','is-high');
  if(element.dataset){
    delete element.dataset.deltaValue;
    delete element.dataset.deltaArrow;
  }
  if(deltaEl){
    deltaEl.textContent = '';
    deltaEl.classList.add('hidden');
  }
}

function updatePercentIndicator({ element, deltaEl, view, referenceDate, value }){
  if(!element) return;
  setPercentColor(element, value);
  if(!Number.isFinite(value)){
    clearPercentIndicator(element, deltaEl);
    return;
  }

  const previousKey = getPreviousPeriodKey(view, referenceDate);
  const previousValue = previousKey ? readStoredPercent(previousKey) : null;

  if(deltaEl){
    if(previousValue == null){
      if(element.dataset){
        delete element.dataset.deltaValue;
        delete element.dataset.deltaArrow;
      }
      deltaEl.textContent = '';
      deltaEl.classList.add('hidden');
    }else{
      const diff = value - previousValue;
      const sign = diff >= 0 ? '+' : '-';
      const arrow = diff >= 0 ? '▲' : '▼';
      const formatted = trimTrailingZeros(Math.abs(diff).toFixed(1));
      deltaEl.textContent = `${arrow} ${sign}${formatted} pp vs periodo anterior`;
      deltaEl.classList.remove('hidden');
      if(element.dataset){
        element.dataset.deltaValue = `${sign}${formatted}`;
        element.dataset.deltaArrow = arrow;
      }
    }
  }

  const currentKey = buildPeriodKey(view, referenceDate);
  storePercentValue(currentKey, value);
}

function formatShortfallValue(value){
  if(value == null || Number.isNaN(value)) return '—';
  return String(value);
}

function formatShortfallMessage(value){
  if(value == null || Number.isNaN(value)){
    return 'Sin datos de jornada para calcular el objetivo';
  }
  if(value <= 0){
    return 'Objetivo alcanzado';
  }
  const plural = value === 1 ? 'sesión' : 'sesiones';
  return `Faltan ${value} ${plural} para alcanzar el objetivo`;
}

function trimTrailingZeros(text){
  return text.replace(/(\.\d*?[1-9])0+$/,'$1').replace(/\.0+$/,'');
}

function minutesToHours(value){
  if(!Number.isFinite(value)) return 0;
  return value / 60;
}

function formatHoursValue(value){
  if(!Number.isFinite(value) || value < 0){
    return '–';
  }
  const decimals = value >= 10 ? 1 : 2;
  return trimTrailingZeros(value.toFixed(decimals));
}

function formatHoursPair(usedMinutes, availableMinutes){
  const used = minutesToHours(usedMinutes);
  const available = minutesToHours(availableMinutes);
  const usedText = formatHoursValue(used);
  if(!Number.isFinite(availableMinutes) || availableMinutes <= 0){
    return `${usedText} h`;
  }
  const availableText = formatHoursValue(available);
  return `${usedText} h / ${availableText} h`;
}

function formatDuration(mins){
  if(!Number.isFinite(mins) || mins <= 0) return '0 min';
  const hours = Math.floor(mins / 60);
  const minutes = Math.round(mins - hours * 60);
  const parts = [];
  if(hours > 0){ parts.push(`${hours} h`); }
  if(minutes > 0 || parts.length === 0){ parts.push(`${minutes} min`); }
  return parts.join(' ');
}

function formatHoursDecimal(mins){
  const hours = minutesToHours(mins);
  if(!Number.isFinite(hours)) return '';
  return trimTrailingZeros(hours.toFixed(2));
}

let week = null;
let weekRequestToken = 0;
let monthSummaryToken = 0;
let yearSummaryToken = 0;
let lastWeekSummaryData = null;
let lastMonthSummaryData = null;
let lastYearSummaryData = null;

function updateWeekUI(){
  if(!week) return;
  const start = week.start;
  const end = new Date(week.end - 1);
  $('#week-label').textContent = `Del ${fmtDate(start)} al ${fmtDate(end)}`;
  $('#range-label').textContent = `Semana consultada: ${fmtDate(start)} → ${fmtDate(end)}`;
  if(weekPicker){ weekPicker.value = formatDateInputValue(start); }
}

function setWeekFromDate(baseDate){
  if(!(baseDate instanceof Date) || Number.isNaN(baseDate.getTime())) return;
  const newWeek = getWeekRange(baseDate);
  if(week && week.start.getTime() === newWeek.start.getTime()){ // sin cambios reales
    week = newWeek;
    updateWeekUI();
    localStorage.setItem('weekStartISO', week.start.toISOString());
    return;
  }
  week = newWeek;
  localStorage.setItem('weekStartISO', week.start.toISOString());
  updateWeekUI();
  monthSummaryToken++;
  yearSummaryToken++;
  resetMonthSummary();
  resetYearSummary();
  if(accessToken){ loadWeek(); }
}

function changeWeekBy(days){
  if(!week) return;
  const base = new Date(week.start);
  base.setDate(base.getDate() + days);
  setWeekFromDate(base);
}

function resetMonthSummary(text='—'){
  monthDadasEl.textContent = '–';
  monthAusenciasEl.textContent = '–';
  if(monthPrivadoAbsEl) monthPrivadoAbsEl.textContent = '–';
  monthProgramadasEl.textContent = '–';
  if(monthTotalEl) monthTotalEl.textContent = '–';
  monthPctEl.textContent = '–';
  clearPercentIndicator(monthPctEl, monthPctDeltaEl);
  if(monthForecastEl){
    monthForecastEl.textContent = '–';
    setPercentColor(monthForecastEl, null);
  }
  if(monthWeekMissingEl) monthWeekMissingEl.textContent = '—';
  if(monthMissingEl) monthMissingEl.textContent = '—';
  monthLabelEl.textContent = text;
  monthHoursLabelEl.textContent = '—';
  lastMonthSummaryData = null;
}

function setMonthSummaryLoading(range){
  monthDadasEl.textContent = '…';
  monthAusenciasEl.textContent = '…';
  if(monthPrivadoAbsEl) monthPrivadoAbsEl.textContent = '…';
  monthProgramadasEl.textContent = '…';
  if(monthTotalEl) monthTotalEl.textContent = '…';
  monthPctEl.textContent = '…';
  clearPercentIndicator(monthPctEl, monthPctDeltaEl);
  if(monthForecastEl){
    monthForecastEl.textContent = '…';
    setPercentColor(monthForecastEl, null);
  }
  if(monthWeekMissingEl) monthWeekMissingEl.textContent = '…';
  if(monthMissingEl) monthMissingEl.textContent = '…';
  monthLabelEl.textContent = range ? `Cargando ${formatMonthRangeText(range)}...` : 'Cargando resumen mensual...';
  monthHoursLabelEl.textContent = '…';
  lastMonthSummaryData = null;
}

function resetYearSummary(text='—'){
  yearDadasEl.textContent = '–';
  yearAusenciasEl.textContent = '–';
  if(yearPrivadoAbsEl) yearPrivadoAbsEl.textContent = '–';
  yearProgramadasEl.textContent = '–';
  yearPctEl.textContent = '–';
  clearPercentIndicator(yearPctEl, yearPctDeltaEl);
  if(yearForecastEl){
    yearForecastEl.textContent = '–';
    setPercentColor(yearForecastEl, null);
  }
  yearLabelEl.textContent = text;
  yearHoursLabelEl.textContent = '—';
  lastYearSummaryData = null;
}

function setYearSummaryLoading(range){
  yearDadasEl.textContent = '…';
  yearAusenciasEl.textContent = '…';
  if(yearPrivadoAbsEl) yearPrivadoAbsEl.textContent = '…';
  yearProgramadasEl.textContent = '…';
  yearPctEl.textContent = '…';
  clearPercentIndicator(yearPctEl, yearPctDeltaEl);
  if(yearForecastEl){
    yearForecastEl.textContent = '…';
    setPercentColor(yearForecastEl, null);
  }
  yearLabelEl.textContent = range ? `Cargando ${formatYearRangeText(range)}...` : 'Cargando resumen anual...';
  yearHoursLabelEl.textContent = '…';
  lastYearSummaryData = null;
}

function cloneRules(rules){
  return JSON.parse(JSON.stringify(rules));
}

if(!cfg.rules || !cfg.rules.centros){ cfg.rules = cloneRules(DEFAULT_RULES); }

if(hoursInputEl){
  const roundedHours = trimTrailingZeros(cfg.hoursAvailable.toFixed(2));
  hoursInputEl.value = roundedHours || '0';
}
updateHoursModeUI();
$('#rules-json').textContent = JSON.stringify(cfg.rules, null, 2);

const initialWeekDate = storedWeekStartIso ? new Date(storedWeekStartIso) : new Date();
week = getWeekRange(Number.isNaN(initialWeekDate.getTime()) ? new Date() : initialWeekDate);
updateWeekUI();
resetMonthSummary();
resetYearSummary();

// ======== AUTH (GIS Token Client) ========
let tokenClient = null; let accessToken = null; let calendars = [];

function initTokenClient(){
  if(!window.google || !google.accounts || !google.accounts.oauth2){
    console.warn('Biblioteca de Google OAuth todavía no disponible.');
    setTimeout(initTokenClient, 250);
    return;
  }
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    prompt: '',
    callback: (resp)=>{
      if(resp && resp.access_token){
        accessToken = resp.access_token;
        setGcStatus('connected');
        loadCalendars();
      }else{
        alert('No se obtuvo access_token');
        setGcStatus('disconnected');
      }
    }
  });
}

function requestGoogleAccessToken(attempt=0){
  if(tokenClient){
    tokenClient.requestAccessToken();
    return;
  }
  if(attempt > 10){
    alert('No se pudo inicializar Google OAuth. Intenta de nuevo en unos segundos.');
    return;
  }
  initTokenClient();
  if(tokenClient){
    tokenClient.requestAccessToken();
  }else{
    setTimeout(()=>requestGoogleAccessToken(attempt + 1), 250);
  }
}

async function loadCalendars(){
  setGcStatus('retrying');
  try{
    showLoading();
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if(!res.ok){
      const msg = await res.text();
      throw new Error(`Error cargando calendarios (${res.status}): ${msg}`);
    }
    const data = await res.json();
    calendars = data.items || [];
    const sel = $('#calendar-select');
    sel.innerHTML = '';
    calendars.forEach(c=>{
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = c.summary; sel.appendChild(opt);
    });
    const persistedCalendarId = localStorage.getItem('selectedCalendarId');
    if(persistedCalendarId && calendars.some(c=> c.id === persistedCalendarId)){
      sel.value = persistedCalendarId;
    }else{
      const lg = calendars.find(c=> (c.summary||'').toLowerCase().includes('andrea lg'));
      if(lg){ sel.value = lg.id; }
    }
    setGcStatus('connected');
    if(calendars.length){ loadWeek(); }
  }catch(err){
    console.error(err);
    alert('No se pudieron cargar los calendarios. Revisa la consola para más detalles.');
    setGcStatus('disconnected');
  }finally{
    hideLoading();
  }
}

// ======== CLASIFICACIÓN ========
function textFromEvent(ev){
  return normalizeTitle([ev.summary||'', ev.location||'', (ev.description||'')].join(' '));
}
const REGEX_CACHE = new Map();

function compilePattern(pattern){
  const key = String(pattern ?? '');
  if(REGEX_CACHE.has(key)) return REGEX_CACHE.get(key);
  try{
    const regex = buildRegex(key);
    REGEX_CACHE.set(key, regex);
    return regex;
  }catch(err){
    console.warn('Patrón inválido ignorado', pattern, err);
    REGEX_CACHE.set(key, null);
    return null;
  }
}

function matchesPattern(text, pattern){
  if(!pattern) return false;
  const regex = compilePattern(pattern);
  if(regex) return regex.test(text);
  const normalized = (text||'').toLowerCase();
  return normalized.includes(String(pattern).toLowerCase());
}
function matchesAnyRegex(text, regexList){
  return (regexList||[]).some(p=> matchesPattern(text, p));
}
function detectCentroFromRules(text){
  const centros = cfg.rules.centros || {};
  const normalizedText = normalizeTitle(text);
  for(const [centro, patterns] of Object.entries(centros)){
    if(matchesAnyRegex(normalizedText, patterns)) return centro;
  }
  return null;
}

const SESSION_REGEX_CACHE = { pattern: null, regex: DEFAULT_SESSION_REGEX };

function buildRegex(pattern){
  const trimmed = pattern.trim();
  if(!trimmed){
    throw new Error('empty pattern');
  }
  if(trimmed.startsWith('/') && trimmed.lastIndexOf('/') > 0){
    const lastSlash = trimmed.lastIndexOf('/');
    const source = trimmed.slice(1, lastSlash);
    const flags = trimmed.slice(lastSlash + 1) || 'i';
    const normalizedFlags = flags.includes('i') ? flags : flags + 'i';
    return new RegExp(source, normalizedFlags);
  }
  return new RegExp(trimmed, 'i');
}

function safeSessionRegex(){
  const pattern = typeof cfg.rules.pattern_sesion === 'string' ? cfg.rules.pattern_sesion : '';
  if(pattern === SESSION_REGEX_CACHE.pattern && SESSION_REGEX_CACHE.regex){
    return SESSION_REGEX_CACHE.regex;
  }
  if(pattern.trim()){
    try{
      const regex = buildRegex(pattern);
      SESSION_REGEX_CACHE.pattern = pattern;
      SESSION_REGEX_CACHE.regex = regex;
      return regex;
    }catch(err){
      console.warn('pattern_sesion inválido, usando defecto', err);
    }
  }
  SESSION_REGEX_CACHE.pattern = pattern;
  SESSION_REGEX_CACHE.regex = DEFAULT_SESSION_REGEX;
  return DEFAULT_SESSION_REGEX;
}

function sessionParse(ev){
  const title = (ev.summary||'').trim();
  const cleaned = title.replace(/^\*/, '').trim();
  const regex = safeSessionRegex();
  const m = cleaned.match(regex);
  if(m){
    const absent = /^\*/.test(title.trim());
    const nh = m[1];
    const nombre = m[2];
    const letra = (m[3]||'').toUpperCase();
    const centro = centroFromLetra(letra) || detectCentroFromRules(cleaned) || '—';
    return {nh, nombre, centro, absent};
  }

  const centroFallback = detectCentroFromRules(cleaned);
  if(!centroFallback) return null;
  const nhFallback = cleaned.match(/\b\d{3,6}\b/);
  if(!nhFallback) return null;
  const absent = /^\*/.test(title.trim());
  const nhText = nhFallback[0];
  const nhIndex = typeof nhFallback.index === 'number' ? nhFallback.index : cleaned.indexOf(nhText);
  const nombre = cleaned
    .slice(nhIndex + nhText.length)
    .replace(/\([^)]*\).*/, '')
    .replace(/[-–:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return {nh: nhText, nombre, centro: centroFallback, absent};
}
function parseBloqueHorarioEvent(ev){
  const title = (ev.summary || '').trim();
  const blockPattern = (cfg.rules.bloques_horario || [UNIVERSAL_BLOCK_PATTERN])[0] || UNIVERSAL_BLOCK_PATTERN;
  return parseBloqueHorarioTitle(title, blockPattern);
}
function isBloqueHorario(ev){
  return Boolean(parseBloqueHorarioEvent(ev));
}

function isEffectiveScheduleBlock(ev){
  return isBloqueHorario(ev);
}
function isExcluirTotal(ev){
  const t = normalizeTitle(ev.summary || '');
  return matchesAnyRegex(t, cfg.rules.otros_excluir_totalmente||[]);
}
function isOtroPorKeyword(ev){
  const t = textFromEvent(ev);
  return (cfg.rules.otros_keywords||[]).some((k)=> t.includes(normalizeTitle(k)));
}
function durationMinutes(ev){
  const start = new Date(ev.start.dateTime || (ev.start.date + 'T00:00:00'));
  const end = new Date(ev.end.dateTime || (ev.end.date + 'T23:59:59'));
  return Math.max(0, Math.round((end - start)/60000));
}

function centroFromLetra(letra){
  if(letra==='G') return 'gines';
  if(letra==='B') return 'bormujos';
  if(letra==='P') return 'privado';
  return null;
}

function capitalize(word){
  if(!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function estadoLabelFromKey(key){
  switch(key){
    case 'dada': return 'Dada';
    case 'programada': return 'Programada';
    case 'en_curso': return 'En curso';
    case 'ausencia': return 'Ausencia';
    default: return 'Otro';
  }
}

function estadoPillClass(key){
  switch(key){
    case 'dada': return 'green';
    case 'programada': return 'yellow';
    case 'en_curso': return 'blue';
    case 'ausencia': return 'red';
    default: return 'gray';
  }
}

function centroPillClassFromKey(key){
  if(key === 'gines') return 'green';
  if(key === 'bormujos') return 'orange';
  if(key === 'privado') return 'purple';
  return 'gray';
}

function getAbsenceDiscountDates(events){
  const dates = new Set();
  if(!Array.isArray(events)) return dates;
  events.forEach((ev)=>{
    if(isExcluirTotal(ev)) return;
    if(!isAbsenceDiscountEvent(ev)) return;
    if(ev.start?.date){
      dateKeysFromRange(ev.start.date, ev.end?.date).forEach((key)=> dates.add(key));
      return;
    }
    const start = new Date(ev.start.dateTime || (ev.start.date + 'T00:00:00'));
    if(Number.isNaN(start.getTime())) return;
    const key = dateKeyFromDate(start);
    if(key) dates.add(key);
  });
  return dates;
}

function processEventsCollection(events, now = new Date()){
  const processed = [];
  const discountDates = getAbsenceDiscountDates(events);
  events.forEach(ev=>{
    const analyzed = analyzeEvent(ev, now, discountDates);
    if(analyzed){ processed.push(analyzed); }
  });
  return processed;
}

function createEmptyNarrativeCounters(){
  return { entorno: 0, familia: 0, recuperacion: 0 };
}

function buildNarrativeCounters(list){
  const counters = createEmptyNarrativeCounters();
  if(!Array.isArray(list)) return counters;
  list.forEach((item)=>{
    const raw = item?.raw;
    if(!raw) return;
    const summary = (raw.summary || '').trim();
    if(!summary || summary.charAt(0) !== '+') return;
    const description = (raw.description || '').toLowerCase();
    if(description){
      if(description.includes('entorno')) counters.entorno++;
      if(description.includes('familia')) counters.familia++;
      if(description.includes('recuperación') || description.includes('recuperacion')) counters.recuperacion++;
    }
  });
  return counters;
}

function summarizeProcessedEvents(list){
  const summary = {
    dadas: 0,
    ausencias: 0,
    programadas: 0,
    enCurso: 0,
    otros: 0,
    gines: 0,
    bormujos: 0,
    privado: 0,
    privadoAusenciasJustificadas: 0,
    privadoAusenciasNoJustificadas: 0,
    totalMinutes: 0,
    scheduleMinutes: 0,
    sessionMinutes: 0,
    scheduledSessionMinutes: 0
  };
  list.forEach(item=>{
    summary.totalMinutes += item.mins;
    if(item.tipo === 'bloque'){
      summary.scheduleMinutes += item.mins;
    }
    switch(item.estadoKey){
      case 'dada':
        summary.dadas++;
        if(item.centroKey === 'gines') summary.gines++;
        else if(item.centroKey === 'bormujos') summary.bormujos++;
        else if(item.centroKey === 'privado') summary.privado++;
        if(item.tipo === 'sesión'){
          summary.sessionMinutes += item.mins;
        }
        break;
      case 'ausencia':
        summary.ausencias++;
        break;
      case 'programada':
        summary.programadas++;
        if(item.tipo === 'sesión'){
          summary.scheduledSessionMinutes += item.mins;
        }
        break;
      case 'en_curso':
        summary.enCurso++;
        if(item.tipo === 'sesión'){
          summary.scheduledSessionMinutes += item.mins;
        }
        break;
      default:
        summary.otros++;
    }
    if(item.privateAbsenceJustified){
      summary.privadoAusenciasJustificadas++;
    }
    if(item.privateAbsenceUnjustified){
      summary.privadoAusenciasNoJustificadas++;
    }
  });
  summary.totalEventos = summary.dadas + summary.ausencias + summary.programadas + summary.enCurso + summary.otros;
  summary.sessionHours = minutesToHours(summary.sessionMinutes);
  summary.totalHours = minutesToHours(summary.totalMinutes);
  summary.scheduleHours = minutesToHours(summary.scheduleMinutes);
  return summary;
}

function analyzeEvent(ev, now = new Date(), discountDates = new Set()){
  if(isExcluirTotal(ev)) return null;
  const start = new Date(ev.start.dateTime || (ev.start.date + 'T00:00:00'));
  const end = new Date(ev.end.dateTime || (ev.end.date + 'T23:59:59'));
  const mins = durationMinutes(ev);
  const title = (ev.summary||'').trim();
  const sp = sessionParse(ev);
  let estadoKey = 'otro';
  let tipo = 'otro';
  let centroKey = null;
  let centroDisplay = '—';
  let privateAbsenceJustified = false;
  let privateAbsenceUnjustified = false;
  let bloque = null;
  const dateKey = ev.start?.date ? ev.start.date : dateKeyFromDate(start);
  const isDiscountDay = dateKey ? discountDates.has(dateKey) : false;

  if(sp){
    tipo = 'sesión';
    const centroRaw = sp.centro || '';
    const normalized = (centroRaw || '').toLowerCase();
    if(CENTER_FILTER_KEYS.includes(normalized)){
      centroKey = normalized;
      centroDisplay = capitalize(normalized);
    }else{
      centroDisplay = centroRaw && centroRaw !== '—' ? centroRaw : '—';
    }
    if(sp.absent && centroKey === 'privado'){
      if(isDiscountDay){
        estadoKey = 'ausencia';
      }else{
        const justified = isPrivateAbsenceJustified(ev);
        if(justified){
          privateAbsenceJustified = true;
          estadoKey = 'ausencia';
        }else{
          privateAbsenceUnjustified = true;
          estadoKey = 'dada';
        }
      }
    }else if(sp.absent){
      estadoKey = 'ausencia';
    }else if(end <= now){
      estadoKey = 'dada';
    }else if(start > now){
      estadoKey = 'programada';
    }else{
      estadoKey = 'en_curso';
    }
  }else{
    bloque = parseBloqueHorarioEvent(ev);
    if(bloque){
      tipo = 'bloque';
      estadoKey = 'otro';
      centroKey = bloque.centro;
      centroDisplay = capitalize(bloque.centro);
    }else if(isOtroPorKeyword(ev)){
      tipo = 'otro';
      estadoKey = 'otro';
    }else{
      tipo = 'otro';
      estadoKey = 'otro';
    }
  }

  return {
    raw: ev,
    title: title || '(sin título)',
    start,
    end,
    mins,
    tipo,
    estadoKey,
    estadoLabel: estadoLabelFromKey(estadoKey),
    estadoClass: estadoPillClass(estadoKey),
    centroKey,
    centroLabel: centroDisplay,
    centroClass: centroPillClassFromKey(centroKey),
    isAllDay: Boolean(ev.start.date),
    privateAbsenceJustified,
    privateAbsenceUnjustified,
    bloque,
  };
}

function renderMonthSummary(events, range){
  const processed = processEventsCollection(events, new Date());
  const summary = summarizeProcessedEvents(processed);
  const availableMinutes = minutesAvailableForRange(range, events);
  const programadasTexto = summary.enCurso > 0 ? `${summary.programadas} (+${summary.enCurso} en curso)` : String(summary.programadas);
  const totalPlaneadas = summary.dadas + summary.programadas + summary.enCurso;
  const pct = calculateProductivityPercent(summary, availableMinutes);
  const forecastPct = calculateForecastPercent(summary, availableMinutes);
  const monthlyShortfall = calculateSessionsShortfall(summary, availableMinutes);
  const weeklyShortfall = lastWeekSummaryData
    ? calculateSessionsShortfall(lastWeekSummaryData.summary, lastWeekSummaryData.availableMinutes)
    : null;

  monthDadasEl.textContent = String(summary.dadas);
  monthAusenciasEl.textContent = String(summary.ausencias);
  if(monthPrivadoAbsEl){
    monthPrivadoAbsEl.textContent = formatPrivateAbsenceSummary(summary);
  }
  monthProgramadasEl.textContent = programadasTexto;
  monthPctEl.textContent = formatPercent(pct);
  updatePercentIndicator({
    element: monthPctEl,
    deltaEl: monthPctDeltaEl,
    view: 'mes',
    referenceDate: range?.start,
    value: pct
  });
  if(monthForecastEl){
    monthForecastEl.textContent = formatPercent(forecastPct);
    setPercentColor(monthForecastEl, forecastPct);
  }
  if(monthTotalEl){
    monthTotalEl.textContent = Number.isFinite(totalPlaneadas) ? String(totalPlaneadas) : '–';
  }
  if(monthWeekMissingEl) monthWeekMissingEl.textContent = formatShortfallValue(weeklyShortfall);
  if(monthMissingEl) monthMissingEl.textContent = formatShortfallValue(monthlyShortfall);
  const extras = summary.totalEventos > 0 ? ` · Total eventos: ${summary.totalEventos}` : '';
  const enCursoText = summary.enCurso > 0 ? ` · En curso: ${summary.enCurso}` : '';
  monthLabelEl.textContent = `${formatMonthRangeText(range)}${extras}${enCursoText}`;
  monthHoursLabelEl.textContent = availableMinutes > 0 ? formatHoursPair(summary.sessionMinutes, availableMinutes) : '—';
  lastMonthSummaryData = { summary: { ...summary }, range, events };
}

function renderYearSummary(events, range){
  const processed = processEventsCollection(events, new Date());
  const summary = summarizeProcessedEvents(processed);
  const availableMinutes = minutesAvailableForRange(range, events);
  const programadasTexto = summary.enCurso > 0 ? `${summary.programadas} (+${summary.enCurso} en curso)` : String(summary.programadas);
  const forecastPct = calculateForecastPercent(summary, availableMinutes);

  yearDadasEl.textContent = String(summary.dadas);
  yearAusenciasEl.textContent = String(summary.ausencias);
  if(yearPrivadoAbsEl){
    yearPrivadoAbsEl.textContent = formatPrivateAbsenceSummary(summary);
  }
  yearProgramadasEl.textContent = programadasTexto;
  const pct = calculateProductivityPercent(summary, availableMinutes);
  yearPctEl.textContent = formatPercent(pct);
  updatePercentIndicator({
    element: yearPctEl,
    deltaEl: yearPctDeltaEl,
    view: 'ano',
    referenceDate: range?.start,
    value: pct
  });
  if(yearForecastEl){
    yearForecastEl.textContent = formatPercent(forecastPct);
    setPercentColor(yearForecastEl, forecastPct);
  }
  const yearlyShortfall = calculateSessionsShortfall(summary, availableMinutes);
  if(yearShortfallEl){
    yearShortfallEl.textContent = formatShortfallMessage(yearlyShortfall);
  }
  const extras = summary.totalEventos > 0 ? ` · Total eventos: ${summary.totalEventos}` : '';
  const enCursoText = summary.enCurso > 0 ? ` · En curso: ${summary.enCurso}` : '';
  yearLabelEl.textContent = `${formatYearRangeText(range)}${extras}${enCursoText}`;
  yearHoursLabelEl.textContent = availableMinutes > 0 ? formatHoursPair(summary.sessionMinutes, availableMinutes) : '—';
  lastYearSummaryData = { summary: { ...summary }, range, events };
}

// ======== CARGA DE EVENTOS ========
async function fetchEventsForRange(calId, range){
  showLoading();
  try{
    const params = new URLSearchParams({
      singleEvents: 'true', orderBy: 'startTime', timeZone: TZ,
      timeMin: range.start.toISOString(), timeMax: range.end.toISOString(), maxResults: '2500'
    });
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?${params.toString()}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }});
    if(!res.ok){
      const msg = await res.text();
      throw new Error(`Error cargando eventos (${res.status}): ${msg}`);
    }
    const data = await res.json();
    return (data.items||[]).filter(e=> !e.status || e.status!=='cancelled');
  }finally{
    hideLoading();
  }
}

async function loadMonthSummary(calId){
  if(!week) return;
  const monthRange = getMonthRange(week.start);
  const token = ++monthSummaryToken;
  setMonthSummaryLoading(monthRange);
  try{
    const events = await fetchEventsForRange(calId, monthRange);
    if(token !== monthSummaryToken) return;
    renderMonthSummary(events, monthRange);
  }catch(err){
    if(token === monthSummaryToken){
      console.error(err);
      resetMonthSummary('No se pudo cargar el resumen mensual.');
    }
  }
}

async function loadYearSummary(calId){
  if(!week) return;
  const yearRange = getYearRange(week.start);
  const token = ++yearSummaryToken;
  setYearSummaryLoading(yearRange);
  try{
    const events = await fetchEventsForRange(calId, yearRange);
    if(token !== yearSummaryToken) return;
    renderYearSummary(events, yearRange);
  }catch(err){
    if(token === yearSummaryToken){
      console.error(err);
      resetYearSummary('No se pudo cargar el resumen anual.');
    }
  }
}

async function loadWeek(){
  const calId = $('#calendar-select').value || 'primary';
  localStorage.setItem('selectedCalendarId', calId);
  monthSummaryToken++;
  yearSummaryToken++;
  weeklyNarrativeCounters = buildNarrativeCounters([]);
  filteredNarrativeCounters = buildNarrativeCounters([]);
  updateNarrativeCountersDisplay(filteredNarrativeCounters);
  if(week){
    setMonthSummaryLoading(getMonthRange(week.start));
    setYearSummaryLoading(getYearRange(week.start));
  }
  const token = ++weekRequestToken;
  try{
    const events = await fetchEventsForRange(calId, week);
    if(token !== weekRequestToken) return;
    render(events);
  }catch(err){
    if(token === weekRequestToken){
      console.error(err);
      alert('No se pudieron cargar los eventos de la semana. Revisa la consola para más detalles.');
      resetMonthSummary();
      resetYearSummary();
    }
    return;
  }
  if(token === weekRequestToken){
    loadMonthSummary(calId);
    loadYearSummary(calId);
  }
}

// ======== RENDER ========
function render(events){
  const now = new Date();
  rawWeekEvents = Array.isArray(events) ? events : [];
  processedWeekEvents = processEventsCollection(events, now);
  weeklyNarrativeCounters = buildNarrativeCounters(processedWeekEvents);
  const summary = summarizeProcessedEvents(processedWeekEvents);
  updateWeeklyStats(summary, rawWeekEvents);
  applyFilters();
}

function updateWeeklyStats(summary, events){
  if(weekDadasEl) weekDadasEl.textContent = String(summary.dadas);
  if(weekAusenciasEl) weekAusenciasEl.textContent = String(summary.ausencias);
  if(weekProgramadasEl) weekProgramadasEl.textContent = String(summary.programadas);
  if(weekEnCursoEl) weekEnCursoEl.textContent = `En curso: ${summary.enCurso}`;
  if(weekGinesEl) weekGinesEl.textContent = String(summary.gines);
  if(weekBormujosEl) weekBormujosEl.textContent = String(summary.bormujos);
  if(weekPrivadoEl) weekPrivadoEl.textContent = String(summary.privado);
  if(weekPrivadoJustEl){
    weekPrivadoJustEl.textContent = `Ausencias just.: ${summary.privadoAusenciasJustificadas}`;
  }
  if(weekPrivadoNoJustEl){
    weekPrivadoNoJustEl.textContent = `Ausencias no just.: ${summary.privadoAusenciasNoJustificadas}`;
  }
  const totalPlaneadas = summary.dadas + summary.programadas + summary.enCurso;
  const availableMinutes = minutesAvailableForRange(week, events);
  const deliveredPercent = calculateProductivityPercent(summary, availableMinutes);
  const forecastPercent = calculateForecastPercent(summary, availableMinutes);
  const shortfall = calculateSessionsShortfall(summary, availableMinutes);
  if(weekTotalEl){
    weekTotalEl.textContent = Number.isFinite(totalPlaneadas) ? String(totalPlaneadas) : '–';
  }
  if(weekPctEl) weekPctEl.textContent = formatPercent(deliveredPercent);
  updatePercentIndicator({
    element: weekPctEl,
    deltaEl: weekPctDeltaEl,
    view: 'semana',
    referenceDate: week?.start,
    value: deliveredPercent
  });
  if(weekForecastEl){
    weekForecastEl.textContent = formatPercent(forecastPercent);
    setPercentColor(weekForecastEl, forecastPercent);
  }
  if(weekShortfallEl){
    weekShortfallEl.textContent = formatShortfallMessage(shortfall);
  }
  if(weekHoursLabelEl){
    weekHoursLabelEl.textContent = formatHoursPair(summary.sessionMinutes, availableMinutes);
  }
  if(monthWeekMissingEl) monthWeekMissingEl.textContent = formatShortfallValue(shortfall);
  lastWeekSummaryData = {
    summary: { ...summary },
    availableMinutes
  };
}

function updateNarrativeCountersDisplay(counters){
  const data = counters || createEmptyNarrativeCounters();
  if(weekEntornoEl) weekEntornoEl.textContent = String(data.entorno ?? 0);
  if(weekFamiliaEl) weekFamiliaEl.textContent = String(data.familia ?? 0);
  if(weekRecuperacionEl) weekRecuperacionEl.textContent = String(data.recuperacion ?? 0);
}

function refreshStoredSummaries(){
  if(lastMonthSummaryData){
    const { summary, range, events } = lastMonthSummaryData;
    const availableMinutes = minutesAvailableForRange(range, events);
    const programadasTexto = summary.enCurso > 0 ? `${summary.programadas} (+${summary.enCurso} en curso)` : String(summary.programadas);
    const totalPlaneadas = summary.dadas + summary.programadas + summary.enCurso;
    const pct = calculateProductivityPercent(summary, availableMinutes);
    const forecastPct = calculateForecastPercent(summary, availableMinutes);
    const monthlyShortfall = calculateSessionsShortfall(summary, availableMinutes);
    const weeklyShortfall = lastWeekSummaryData
      ? calculateSessionsShortfall(lastWeekSummaryData.summary, lastWeekSummaryData.availableMinutes)
      : null;

    monthDadasEl.textContent = String(summary.dadas);
    monthAusenciasEl.textContent = String(summary.ausencias);
    monthProgramadasEl.textContent = programadasTexto;
    monthPctEl.textContent = formatPercent(pct);
    updatePercentIndicator({
      element: monthPctEl,
      deltaEl: monthPctDeltaEl,
      view: 'mes',
      referenceDate: range?.start,
      value: pct
    });
    if(monthForecastEl){
      monthForecastEl.textContent = formatPercent(forecastPct);
      setPercentColor(monthForecastEl, forecastPct);
    }
    if(monthTotalEl){
      monthTotalEl.textContent = Number.isFinite(totalPlaneadas) ? String(totalPlaneadas) : '–';
    }
    if(monthWeekMissingEl) monthWeekMissingEl.textContent = formatShortfallValue(weeklyShortfall);
    if(monthMissingEl) monthMissingEl.textContent = formatShortfallValue(monthlyShortfall);
    monthHoursLabelEl.textContent = availableMinutes > 0 ? formatHoursPair(summary.sessionMinutes, availableMinutes) : '—';
  }
  if(lastYearSummaryData){
    const { summary, range, events } = lastYearSummaryData;
    const availableMinutes = minutesAvailableForRange(range, events);
    const programadasTexto = summary.enCurso > 0 ? `${summary.programadas} (+${summary.enCurso} en curso)` : String(summary.programadas);
    const pct = calculateProductivityPercent(summary, availableMinutes);
    const forecastPct = calculateForecastPercent(summary, availableMinutes);
    const yearlyShortfall = calculateSessionsShortfall(summary, availableMinutes);

    yearDadasEl.textContent = String(summary.dadas);
    yearAusenciasEl.textContent = String(summary.ausencias);
    yearProgramadasEl.textContent = programadasTexto;
    yearPctEl.textContent = formatPercent(pct);
    updatePercentIndicator({
      element: yearPctEl,
      deltaEl: yearPctDeltaEl,
      view: 'ano',
      referenceDate: range?.start,
      value: pct
    });
    if(yearForecastEl){
      yearForecastEl.textContent = formatPercent(forecastPct);
      setPercentColor(yearForecastEl, forecastPct);
    }
    if(yearShortfallEl){
      yearShortfallEl.textContent = formatShortfallMessage(yearlyShortfall);
    }
    yearHoursLabelEl.textContent = availableMinutes > 0 ? formatHoursPair(summary.sessionMinutes, availableMinutes) : '—';
  }
}

function formatDeltaForReport(element, label){
  if(!element) return `Δpp vs ${label}: sin datos`;
  const value = element.dataset?.deltaValue;
  if(!value){
    return `Δpp vs ${label}: sin datos`;
  }
  const arrow = element.dataset?.deltaArrow ? `${element.dataset.deltaArrow} ` : '';
  return `Δpp vs ${label}: ${arrow}${value} pp`;
}

function getTextContent(el){
  return (el?.textContent || '–').trim();
}

function buildQuickReport(viewKey){
  const sanitizedView = viewKey || SUMMARY_DEFAULT_VIEW;
  switch(sanitizedView){
    case 'mes':{
      const base = `Este mes llevas ${getTextContent(monthDadasEl)} sesiones (${getTextContent(monthPctEl)}), ${getTextContent(monthProgramadasEl)} programadas y ${getTextContent(monthAusenciasEl)} ausencias.`;
      const delta = formatDeltaForReport(monthPctEl, 'mes anterior');
      return `${base} ${delta}.`;
    }
    case 'ano':{
      const base = `Este año llevas ${getTextContent(yearDadasEl)} sesiones (${getTextContent(yearPctEl)}), ${getTextContent(yearProgramadasEl)} programadas y ${getTextContent(yearAusenciasEl)} ausencias.`;
      const delta = formatDeltaForReport(yearPctEl, 'año anterior');
      return `${base} ${delta}.`;
    }
    case 'semana':
    default:{
      const base = `Esta semana llevas ${getTextContent(weekDadasEl)} sesiones (${getTextContent(weekPctEl)}), ${getTextContent(weekProgramadasEl)} programadas y ${getTextContent(weekAusenciasEl)} ausencias.`;
      const delta = formatDeltaForReport(weekPctEl, 'semana anterior');
      return `${base} ${delta}.`;
    }
  }
}

function statusMatches(item){
  if(activeStatusFilters.size === 0) return true;
  for(const key of activeStatusFilters){
    const states = STATUS_FILTER_MAP[key] || [key];
    if(states.includes(item.estadoKey)){ return true; }
  }
  return false;
}

function centerMatches(item){
  if(activeCenterFilters.size === 0) return true;
  if(!item.centroKey) return true;
  return activeCenterFilters.has(item.centroKey);
}

function applyFilters(){
  if(!Array.isArray(processedWeekEvents)){ processedWeekEvents = []; }
  const filtered = processedWeekEvents.filter(item=> statusMatches(item) && centerMatches(item));
  filteredWeekEvents = filtered;
  filteredNarrativeCounters = buildNarrativeCounters(filtered);
  updateNarrativeCountersDisplay(filteredNarrativeCounters);
  renderTableRows(filtered);
}

function renderTableRows(list){
  const tbody = $('#events-table tbody');
  tbody.innerHTML = '';
  if(!list.length){
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.className = 'muted';
    td.textContent = 'No hay eventos que mostrar con las reglas actuales.';
    tr.appendChild(td);
    tbody.appendChild(tr);
  }else{
    list.forEach(item=>{
      const tr = document.createElement('tr');

      const tdFecha = document.createElement('td');
      tdFecha.textContent = fmtDate(item.start);
      tr.appendChild(tdFecha);

      const tdInicio = document.createElement('td');
      tdInicio.textContent = item.isAllDay ? '—' : fmtTime(item.start);
      tr.appendChild(tdInicio);

      const tdFin = document.createElement('td');
      tdFin.textContent = item.isAllDay ? '—' : fmtTime(item.end);
      tr.appendChild(tdFin);

      const tdTitulo = document.createElement('td');
      tdTitulo.textContent = item.title;
      tr.appendChild(tdTitulo);

      const tdCentro = document.createElement('td');
      const centroSpan = document.createElement('span');
      centroSpan.className = `pill ${item.centroClass}`;
      centroSpan.textContent = item.centroLabel || '—';
      tdCentro.appendChild(centroSpan);
      tr.appendChild(tdCentro);

      const tdEstado = document.createElement('td');
      const estadoSpan = document.createElement('span');
      estadoSpan.className = `pill ${item.estadoClass}`;
      estadoSpan.textContent = item.estadoLabel;
      tdEstado.appendChild(estadoSpan);
      tr.appendChild(tdEstado);

      const tdTipo = document.createElement('td');
      tdTipo.textContent = capitalize(item.tipo);
      tr.appendChild(tdTipo);

      const tdDuracion = document.createElement('td');
      tdDuracion.textContent = formatDuration(item.mins);
      tr.appendChild(tdDuracion);

      tbody.appendChild(tr);
    });
  }

  const subtotal = summarizeProcessedEvents(list);
  const subtotalRow = document.createElement('tr');
  subtotalRow.className = 'subtotal-row';
  const cell1 = document.createElement('td');
  cell1.colSpan = 4;
  cell1.textContent = 'Subtotal (filtro actual)';
  const cell2 = document.createElement('td');
  cell2.colSpan = 2;
  cell2.textContent = `Dadas: ${subtotal.dadas} · Programadas: ${subtotal.programadas} · En curso: ${subtotal.enCurso}`;
  const cell3 = document.createElement('td');
  cell3.textContent = `Ausencias: ${subtotal.ausencias}`;
  const cell4 = document.createElement('td');
  const subtotalSessionHours = formatHoursValue(subtotal.sessionHours);
  const subtotalTotalHours = formatHoursValue(subtotal.totalHours);
  const subtotalSessionLabel = subtotalSessionHours === '–' ? '–' : `${subtotalSessionHours} h`;
  const subtotalTotalLabel = subtotalTotalHours === '–' ? '–' : `${subtotalTotalHours} h`;
  cell4.textContent = `Horas sesiones: ${subtotalSessionLabel} · Duración total: ${subtotalTotalLabel}`;
  subtotalRow.appendChild(cell1);
  subtotalRow.appendChild(cell2);
  subtotalRow.appendChild(cell3);
  subtotalRow.appendChild(cell4);
  tbody.appendChild(subtotalRow);
}

quickReportBtn?.addEventListener('click', ()=>{
  const view = currentSummaryView || SUMMARY_DEFAULT_VIEW;
  const report = buildQuickReport(view);
  if(report){
    alert(report);
  }
});

function syncFilterChips(){
  if(statusFiltersEl){
    statusFiltersEl.querySelectorAll('.chip').forEach(btn=>{
      const key = btn.dataset.key;
      if(!key) return;
      if(activeStatusFilters.has(key)) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }
  if(centerFiltersEl){
    centerFiltersEl.querySelectorAll('.chip').forEach(btn=>{
      const key = btn.dataset.key;
      if(!key) return;
      if(activeCenterFilters.has(key)) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }
}

syncFilterChips();
applyFilters();

function exportWeekToCsv(){
  if(!filteredWeekEvents.length){
    alert('No hay eventos para exportar con el filtro actual.');
    return;
  }
  const rows = [['Fecha','Inicio','Fin','Título','Centro','Estado','Tipo','Duración (h)']];
  filteredWeekEvents.forEach(item=>{
    rows.push([
      fmtDate(item.start),
      item.isAllDay ? '—' : fmtTime(item.start),
      item.isAllDay ? '—' : fmtTime(item.end),
      item.title,
      item.centroLabel || '—',
      item.estadoLabel,
      capitalize(item.tipo),
      formatHoursDecimal(item.mins)
    ]);
  });
  const csv = rows
    .map(cols=> cols.map(val=>`"${String(val??'').replace(/"/g,'""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const link = document.createElement('a');
  const startLabel = week ? formatDateInputValue(week.start) : formatDateInputValue(new Date());
  link.href = URL.createObjectURL(blob);
  link.download = `sesiones_${startLabel || 'semana'}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function triggerPrintView(){
  const previousView = currentView;
  document.body.dataset.previousView = previousView;
  if(previousView !== 'pacientes'){
    activateView('pacientes');
  }
  document.body.classList.add('print-friendly');
  setTimeout(()=>{ window.print(); }, 50);
}

// ======== EVENTOS UI ========
statusFiltersEl?.addEventListener('click', (event)=>{
  const btn = event.target.closest('.chip');
  if(!btn) return;
  const key = btn.dataset.key;
  if(!key) return;
  if(activeStatusFilters.has(key)) activeStatusFilters.delete(key);
  else activeStatusFilters.add(key);
  syncFilterChips();
  applyFilters();
});

centerFiltersEl?.addEventListener('click', (event)=>{
  const btn = event.target.closest('.chip');
  if(!btn) return;
  const key = btn.dataset.key;
  if(!key) return;
  if(activeCenterFilters.has(key)) activeCenterFilters.delete(key);
  else activeCenterFilters.add(key);
  syncFilterChips();
  applyFilters();
});

exportCsvBtn?.addEventListener('click', exportWeekToCsv);
printViewBtn?.addEventListener('click', triggerPrintView);
window.addEventListener('afterprint', ()=>{
  const previousView = document.body.dataset.previousView;
  document.body.classList.remove('print-friendly');
  if(previousView && previousView !== currentView){
    activateView(previousView);
  }
  delete document.body.dataset.previousView;
});

$('#signin').addEventListener('click', ()=>{
  requestGoogleAccessToken();
});

$('#refresh').addEventListener('click', ()=>{
  if(accessToken){
    loadCalendars();
  }else{
    requestGoogleAccessToken();
  }
});
$('#load-week').addEventListener('click', ()=>{ if(!accessToken) return alert('Conéctate primero'); loadWeek(); });
$('#calendar-select')?.addEventListener('change', (event)=>{
  const value = event.target.value;
  if(value) localStorage.setItem('selectedCalendarId', value);
  if(accessToken){ loadWeek(); }
});
$('#prev-week')?.addEventListener('click', ()=> changeWeekBy(-7));
$('#next-week')?.addEventListener('click', ()=> changeWeekBy(7));
$('#today-week')?.addEventListener('click', ()=> setWeekFromDate(new Date()));
weekPicker?.addEventListener('change', (event)=>{
  const value = event.target.value;
  const date = parseDateInputValue(value);
  if(date) setWeekFromDate(date);
});

hoursModeEl?.addEventListener('change', (event)=>{
  const value = event.target.value === 'effective_schedule' ? 'effective_schedule' : 'fixed';
  cfg.hoursCalculationMode = value;
  localStorage.setItem('hoursCalculationMode', value);
  updateHoursModeUI();
  if(processedWeekEvents.length){
    updateWeeklyStats(summarizeProcessedEvents(processedWeekEvents), rawWeekEvents);
  }
  refreshStoredSummaries();
});

$('#save-cfg').addEventListener('click', ()=>{
  const mode = hoursModeEl?.value === 'effective_schedule' ? 'effective_schedule' : 'fixed';
  cfg.hoursCalculationMode = mode;
  localStorage.setItem('hoursCalculationMode', mode);

  if(mode === 'fixed'){
    const inputValue = Number(hoursInputEl?.value || 0);
    const sanitizedHours = Number.isFinite(inputValue) && inputValue >= 0 ? inputValue : 0;
    cfg.hoursAvailable = sanitizedHours;
    cfg.minutesAvailable = Math.round(sanitizedHours * 60);
    localStorage.setItem('hoursAvailable', String(sanitizedHours));
    localStorage.setItem('minutesAvailable', String(cfg.minutesAvailable));
    if(hoursInputEl){
      hoursInputEl.value = trimTrailingZeros(sanitizedHours.toFixed(2));
    }
  }

  updateHoursModeUI();
  if(processedWeekEvents.length){
    updateWeeklyStats(summarizeProcessedEvents(processedWeekEvents), rawWeekEvents);
  }
  refreshStoredSummaries();
});

$('#save-rules').addEventListener('click', ()=>{
  try{
    const json = JSON.parse($('#rules-json').textContent);
    if(typeof json.pattern_sesion === 'string' && json.pattern_sesion.trim()){
      try{
        new RegExp(json.pattern_sesion, 'i');
      }catch(err){
        alert('Patrón inválido');
        return;
      }
    }
    cfg.rules = json;
    localStorage.setItem('rules', JSON.stringify(json));
    SESSION_REGEX_CACHE.pattern = null;
    SESSION_REGEX_CACHE.regex = DEFAULT_SESSION_REGEX;
    alert('Reglas guardadas. Recarga la semana para aplicar cambios.');
  }catch(e){ alert('JSON inválido en las reglas'); }
});

$('#reset-rules').addEventListener('click', ()=>{
  cfg.rules = cloneRules(DEFAULT_RULES);
  $('#rules-json').textContent = JSON.stringify(cfg.rules, null, 2);
  localStorage.removeItem('rules');
  SESSION_REGEX_CACHE.pattern = null;
  SESSION_REGEX_CACHE.regex = DEFAULT_SESSION_REGEX;
  alert('Reglas restauradas. Recarga la semana para aplicar cambios.');
});

// Silenciar errores causados por extensiones de navegador que cierran canales de mensaje
window.addEventListener('unhandledrejection', (event)=>{
  const msg = event?.reason?.message || '';
  if(typeof msg === 'string' && msg.includes('message channel closed before a response was received')){
    event.preventDefault();
    console.warn('Ignorando error externo del canal de mensajes:', event.reason);
  }
});

// Inicializa el cliente OAuth al cargar; GIS reutilizará sesión si es posible
window.addEventListener('load', ()=>{
  initTokenClient();
});
