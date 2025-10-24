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

const storedHoursValue = localStorage.getItem('hoursAvailable');
const storedMinutesValue = localStorage.getItem('minutesAvailable');
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
  rules: JSON.parse(localStorage.getItem('rules') || '{}'),
  icalUrl: localStorage.getItem('icalUrl') || ''
};

if(!Number.isFinite(cfg.hoursAvailable) || cfg.hoursAvailable <= 0){
  cfg.hoursAvailable = 38.5;
  cfg.minutesAvailable = cfg.hoursAvailable * 60;
}

const storedWeekStartIso = localStorage.getItem('weekStartISO') || '';

const weekPicker = $('#week-picker');
const weekHoursEl = $('#stat-week-hours');
const weekDadasEl = $('#stat-dadas');
const weekAusenciasEl = $('#stat-ausencias');
const weekProgramadasEl = $('#stat-programadas');
const weekEnCursoEl = $('#stat-en-curso');
const weekOtrosEl = $('#stat-otros');
const weekGinesEl = $('#stat-gines');
const weekBormujosEl = $('#stat-bormujos');
const weekPrivadoEl = $('#stat-privado');
const hoursLabelEl = $('#hours-label');
const monthHoursValueEl = $('#stat-month-hours');
const monthDadasEl = $('#stat-month-dadas');
const monthAusenciasEl = $('#stat-month-ausencias');
const monthProgramadasEl = $('#stat-month-programadas');
const monthPctEl = $('#stat-month-pct');
const monthLabelEl = $('#month-label');
const monthHoursLabelEl = $('#month-hours-label');
const yearHoursValueEl = $('#stat-year-hours');
const yearDadasEl = $('#stat-year-dadas');
const yearAusenciasEl = $('#stat-year-ausencias');
const yearProgramadasEl = $('#stat-year-programadas');
const yearPctEl = $('#stat-year-pct');
const yearLabelEl = $('#year-label');
const yearHoursLabelEl = $('#year-hours-label');
const loadingIndicatorEl = $('#loading-indicator');
const statusFiltersEl = $('#status-filters');
const centerFiltersEl = $('#center-filters');
const hoursInputEl = $('#cfg-hours');
const icalInputEl = $('#ical-url');
const upcomingListEl = $('#upcoming-sessions');
const upcomingInfoEl = $('#upcoming-info');
const exportCsvBtn = $('#export-csv');
const printViewBtn = $('#print-view');
const refreshBtn = $('#refresh');
const loadWeekBtn = $('#load-week');
const prevWeekBtn = $('#prev-week');
const nextWeekBtn = $('#next-week');
const todayWeekBtn = $('#today-week');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const saveIcalBtn = $('#save-ical');

const FALLBACK_SESSION_REGEX = /^\*?\s*(\d{3,6})\s+(.+?)\s*\(([BGP])\)\s*$/i;

const DEFAULT_RULES = {
  centros: { gines:["(g)"], bormujos:["(b)"], privado:["(p)"] },
  pattern_sesion: FALLBACK_SESSION_REGEX.source,
  otros_excluir_totalmente: ["^g\s*:\s*\d+$","^b\s*:\s*\d+$","^ent\.\s*[bg]\s*:\s*\d+"],
  bloques_horario: ["^[bg]\s*\d{1,2}$"],
  otros_keywords: ["firma","comida","coordinación","reunión","formación","llamada","administrativo","battelle"]
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
let loadingCounter = 0;
let cachedIcsEvents = [];
let cachedIcsUrl = cfg.icalUrl || '';
let icsLoadingPromise = null;
let icsLoadedOnce = false;

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

function formatMonthRangeText(range){
  const end = new Date(range.end - 1);
  return `Mes de ${fmtMonthYear(range.start)} (${fmtDate(range.start)} - ${fmtDate(end)})`;
}

function formatYearRangeText(range){
  const end = new Date(range.end - 1);
  return `Año ${fmtYear(range.start)} (${fmtDate(range.start)} - ${fmtDate(end)})`;
}

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

function minutesAvailableForRange(range){
  const weeklyMinutes = Number(cfg.minutesAvailable) || 0;
  if(!range || weeklyMinutes <= 0) return 0;
  const diffMs = Math.max(0, range.end - range.start);
  return weeklyMinutes * (diffMs / WEEK_IN_MS);
}

async function fetchIcal(url){
  const response = await fetch(url, { cache: 'no-store' });
  if(!response.ok){
    const text = await response.text().catch(()=> '');
    throw new Error(`Error al descargar el iCal (${response.status}): ${text}`);
  }
  return response.text();
}

function decodeIcsText(value=''){
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseIcsDate(value='', params={}){
  const val = String(value).trim();
  if(!val){ return null; }
  const upperParams = Object.fromEntries(
    Object.entries(params).map(([k,v])=> [k.toUpperCase(), v])
  );
  const tz = upperParams.TZID || null;
  const isDateOnly = upperParams.VALUE === 'DATE' || /^\d{8}$/.test(val);
  if(isDateOnly){
    return { date: `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}` };
  }
  const zMatch = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if(zMatch){
    const iso = `${zMatch[1]}-${zMatch[2]}-${zMatch[3]}T${zMatch[4]}:${zMatch[5]}:${zMatch[6]}Z`;
    return { dateTime: iso };
  }
  const localMatch = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if(localMatch){
    const iso = `${localMatch[1]}-${localMatch[2]}-${localMatch[3]}T${localMatch[4]}:${localMatch[5]}:${localMatch[6]}`;
    const result = { dateTime: iso };
    if(tz){ result.timeZone = tz; }
    return result;
  }
  return { dateTime: val };
}

function eventsFromIcs(text){
  if(typeof text !== 'string' || !text.trim()){ return []; }
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = normalized.split('\n');
  const lines = [];
  rawLines.forEach(line=>{
    if(line.startsWith(' ') || line.startsWith('\t')){
      if(lines.length){ lines[lines.length - 1] += line.slice(1); }
    }else{
      lines.push(line.trimEnd());
    }
  });
  const events = [];
  let current = null;
  lines.forEach(line=>{
    if(line === 'BEGIN:VEVENT'){
      current = {};
      return;
    }
    if(line === 'END:VEVENT'){
      if(current && (!current.status || current.status.toUpperCase() !== 'CANCELLED')){
        const summary = decodeIcsText(current.summary || '');
        const description = decodeIcsText(current.description || '');
        const location = decodeIcsText(current.location || '');
        const start = current.start || null;
        const end = current.end || null;
        if(start){
          events.push({
            uid: current.uid || null,
            summary,
            description,
            location,
            start,
            end: end || start,
            status: current.status || null
          });
        }
      }
      current = null;
      return;
    }
    if(!current || !line){ return; }
    const [rawKey, ...rest] = line.split(':');
    if(rest.length === 0){ return; }
    const value = rest.join(':');
    const [propName, ...paramParts] = rawKey.split(';');
    const params = {};
    paramParts.forEach(part=>{
      const [pKey, pVal] = part.split('=');
      if(pKey){ params[pKey.toUpperCase()] = pVal; }
    });
    const key = propName.toUpperCase();
    switch(key){
      case 'DTSTART':
        current.start = parseIcsDate(value, params);
        break;
      case 'DTEND':
        current.end = parseIcsDate(value, params);
        break;
      case 'SUMMARY':
        current.summary = value;
        break;
      case 'DESCRIPTION':
        current.description = value;
        break;
      case 'LOCATION':
        current.location = value;
        break;
      case 'UID':
        current.uid = value;
        break;
      case 'STATUS':
        current.status = value;
        break;
      default:
        break;
    }
  });
  return events;
}

async function loadIcsEvents(force=false){
  const inputUrl = (icalInputEl?.value || cfg.icalUrl || '').trim();
  if(!inputUrl){
    throw new Error('Configura la URL iCal en Ajustes.');
  }
  if(!force && icsLoadedOnce && cachedIcsUrl === inputUrl){
    return cachedIcsEvents;
  }
  if(!force && icsLoadingPromise && cachedIcsUrl === inputUrl){
    return icsLoadingPromise;
  }
  const loader = (async()=>{
    showLoading();
    try{
      const icsText = await fetchIcal(inputUrl);
      const events = eventsFromIcs(icsText);
      cachedIcsEvents = events;
      cachedIcsUrl = inputUrl;
      cfg.icalUrl = inputUrl;
      localStorage.setItem('icalUrl', inputUrl);
      icsLoadedOnce = true;
      return events;
    }finally{
      hideLoading();
      icsLoadingPromise = null;
    }
  })();
  icsLoadingPromise = loader;
  return loader;
}

function formatPercent(value){
  if(!Number.isFinite(value) || value < 0){
    return '–';
  }
  const fixed = value.toFixed(1);
  return `${fixed.replace(/\.0$/, '')}%`;
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

function minutesToHhmm(min){
  if(!Number.isFinite(min) || min < 0){
    return '0:00 h';
  }
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}:${String(m).padStart(2,'0')} h`;
}

function formatHoursDecimal(min){
  if(!Number.isFinite(min) || min < 0){
    return '–';
  }
  const hours = Math.round((min / 60) * 10) / 10;
  const text = hours.toFixed(1).replace(/\.0$/, '');
  return `${text} h`;
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

function formatDuration(mins, options={}){
  const { compact = false } = options;
  if(!Number.isFinite(mins) || mins <= 0){
    return compact ? '0:00 h' : '0 h';
  }
  if(compact){
    return minutesToHhmm(mins);
  }
  return formatHoursDecimal(mins);
}

let week = null;
let weekRequestToken = 0;
let monthSummaryToken = 0;
let yearSummaryToken = 0;
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
  loadWeek();
}

function changeWeekBy(days){
  if(!week) return;
  const base = new Date(week.start);
  base.setDate(base.getDate() + days);
  setWeekFromDate(base);
}

function resetMonthSummary(text='—'){
  monthHoursValueEl.textContent = '–';
  monthDadasEl.textContent = '–';
  monthAusenciasEl.textContent = '–';
  monthProgramadasEl.textContent = '–';
  monthPctEl.textContent = '–';
  monthLabelEl.textContent = text;
  monthHoursLabelEl.textContent = '—';
  lastMonthSummaryData = null;
}

function setMonthSummaryLoading(range){
  monthHoursValueEl.textContent = '…';
  monthDadasEl.textContent = '…';
  monthAusenciasEl.textContent = '…';
  monthProgramadasEl.textContent = '…';
  monthPctEl.textContent = '…';
  monthLabelEl.textContent = range ? `Cargando ${formatMonthRangeText(range)}...` : 'Cargando resumen mensual...';
  monthHoursLabelEl.textContent = '…';
  lastMonthSummaryData = null;
}

function resetYearSummary(text='—'){
  yearHoursValueEl.textContent = '–';
  yearDadasEl.textContent = '–';
  yearAusenciasEl.textContent = '–';
  yearProgramadasEl.textContent = '–';
  yearPctEl.textContent = '–';
  yearLabelEl.textContent = text;
  yearHoursLabelEl.textContent = '—';
  lastYearSummaryData = null;
}

function setYearSummaryLoading(range){
  yearHoursValueEl.textContent = '…';
  yearDadasEl.textContent = '…';
  yearAusenciasEl.textContent = '…';
  yearProgramadasEl.textContent = '…';
  yearPctEl.textContent = '…';
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
if(icalInputEl){
  icalInputEl.value = cfg.icalUrl || '';
}
$('#rules-json').textContent = JSON.stringify(cfg.rules, null, 2);

const initialWeekDate = storedWeekStartIso ? new Date(storedWeekStartIso) : new Date();
week = getWeekRange(Number.isNaN(initialWeekDate.getTime()) ? new Date() : initialWeekDate);
updateWeekUI();
resetMonthSummary();
resetYearSummary();

// ======== CLASIFICACIÓN ========
function textFromEvent(ev){
  return [ev.summary||'', ev.location||'', (ev.description||'')].join(' ').toLowerCase().trim();
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
  const lower = text.toLowerCase();
  for(const [centro, patterns] of Object.entries(centros)){
    if(matchesAnyRegex(lower, patterns)) return centro;
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
function isBloqueHorario(ev){
  const t = (ev.summary||'').trim();
  return matchesAnyRegex(t, cfg.rules.bloques_horario||[]);
}
function isExcluirTotal(ev){
  const t = (ev.summary||'').trim();
  return matchesAnyRegex(t, cfg.rules.otros_excluir_totalmente||[]);
}
function isOtroPorKeyword(ev){
  const t = textFromEvent(ev);
  return (cfg.rules.otros_keywords||[]).some(k=> t.includes(k.toLowerCase()));
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

function processEventsCollection(events, now = new Date()){
  const processed = [];
  events.forEach(ev=>{
    const analyzed = analyzeEvent(ev, now);
    if(analyzed){ processed.push(analyzed); }
  });
  return processed;
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
    totalMinutes: 0,
    dadasMinutes: 0
  };
  list.forEach(item=>{
    summary.totalMinutes += item.mins;
    switch(item.estadoKey){
      case 'dada':
        summary.dadas++;
        summary.dadasMinutes += item.mins;
        if(item.centroKey === 'gines') summary.gines++;
        else if(item.centroKey === 'bormujos') summary.bormujos++;
        else if(item.centroKey === 'privado') summary.privado++;
        break;
      case 'ausencia':
        summary.ausencias++;
        break;
      case 'programada':
        summary.programadas++;
        break;
      case 'en_curso':
        summary.enCurso++;
        break;
      default:
        summary.otros++;
    }
  });
  summary.totalEventos = summary.dadas + summary.ausencias + summary.programadas + summary.enCurso + summary.otros;
  summary.sessionMinutes = summary.dadasMinutes;
  summary.sessionHours = minutesToHours(summary.dadasMinutes);
  summary.totalHours = minutesToHours(summary.totalMinutes);
  return summary;
}

function analyzeEvent(ev, now = new Date()){
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
    if(sp.absent){
      estadoKey = 'ausencia';
    }else if(end <= now){
      estadoKey = 'dada';
    }else if(start > now){
      estadoKey = 'programada';
    }else{
      estadoKey = 'en_curso';
    }
  }else if(isBloqueHorario(ev)){
    tipo = 'bloque';
    estadoKey = 'otro';
  }else if(isOtroPorKeyword(ev)){
    tipo = 'otro';
    estadoKey = 'otro';
  }else{
    tipo = 'otro';
    estadoKey = 'otro';
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
  };
}

function renderMonthSummary(events, range){
  const processed = processEventsCollection(events, new Date());
  const summary = summarizeProcessedEvents(processed);
  const totalSesiones = summary.dadas + summary.ausencias;
  const availableMinutes = minutesAvailableForRange(range);
  const programadasTexto = summary.enCurso > 0 ? `${summary.programadas} (+${summary.enCurso} en curso)` : String(summary.programadas);

  monthHoursValueEl.textContent = formatHoursDecimal(summary.dadasMinutes);
  monthDadasEl.textContent = String(summary.dadas);
  monthAusenciasEl.textContent = String(summary.ausencias);
  monthProgramadasEl.textContent = programadasTexto;
  const pct = totalSesiones > 0 ? (summary.dadas / totalSesiones) * 100 : null;
  monthPctEl.textContent = formatPercent(pct);
  const extras = summary.totalEventos > 0 ? ` · Total eventos: ${summary.totalEventos}` : '';
  const enCursoText = summary.enCurso > 0 ? ` · En curso: ${summary.enCurso}` : '';
  monthLabelEl.textContent = `${formatMonthRangeText(range)}${extras}${enCursoText}`;
  monthHoursLabelEl.textContent = availableMinutes > 0 ? formatHoursPair(summary.dadasMinutes, availableMinutes) : formatHoursDecimal(summary.dadasMinutes);
  lastMonthSummaryData = { summary, range };
}

function renderYearSummary(events, range){
  const processed = processEventsCollection(events, new Date());
  const summary = summarizeProcessedEvents(processed);
  const totalSesiones = summary.dadas + summary.ausencias;
  const availableMinutes = minutesAvailableForRange(range);
  const programadasTexto = summary.enCurso > 0 ? `${summary.programadas} (+${summary.enCurso} en curso)` : String(summary.programadas);

  yearHoursValueEl.textContent = formatHoursDecimal(summary.dadasMinutes);
  yearDadasEl.textContent = String(summary.dadas);
  yearAusenciasEl.textContent = String(summary.ausencias);
  yearProgramadasEl.textContent = programadasTexto;
  const pct = totalSesiones > 0 ? (summary.dadas / totalSesiones) * 100 : null;
  yearPctEl.textContent = formatPercent(pct);
  const extras = summary.totalEventos > 0 ? ` · Total eventos: ${summary.totalEventos}` : '';
  const enCursoText = summary.enCurso > 0 ? ` · En curso: ${summary.enCurso}` : '';
  yearLabelEl.textContent = `${formatYearRangeText(range)}${extras}${enCursoText}`;
  yearHoursLabelEl.textContent = availableMinutes > 0 ? formatHoursPair(summary.dadasMinutes, availableMinutes) : formatHoursDecimal(summary.dadasMinutes);
  lastYearSummaryData = { summary, range };
}

// ======== CARGA DE EVENTOS ========
async function fetchEventsForRange(range){
  const events = await loadIcsEvents(false);
  if(!Array.isArray(events)) return [];
  return events
    .filter(ev=>{
      const startValue = ev.start?.dateTime || ev.start?.date;
      if(!startValue) return false;
      const start = new Date(ev.start.dateTime || (ev.start.date + 'T00:00:00'));
      return start >= range.start && start < range.end;
    })
    .sort((a,b)=>{
      const aStart = new Date(a.start?.dateTime || (a.start?.date + 'T00:00:00'));
      const bStart = new Date(b.start?.dateTime || (b.start?.date + 'T00:00:00'));
      return aStart - bStart;
    });
}

async function loadMonthSummary(){
  if(!week) return;
  const monthRange = getMonthRange(week.start);
  const token = ++monthSummaryToken;
  setMonthSummaryLoading(monthRange);
  try{
    const events = await fetchEventsForRange(monthRange);
    if(token !== monthSummaryToken) return;
    renderMonthSummary(events, monthRange);
  }catch(err){
    if(token === monthSummaryToken){
      console.error(err);
      resetMonthSummary('No se pudo cargar el resumen mensual.');
    }
  }
}

async function loadYearSummary(){
  if(!week) return;
  const yearRange = getYearRange(week.start);
  const token = ++yearSummaryToken;
  setYearSummaryLoading(yearRange);
  try{
    const events = await fetchEventsForRange(yearRange);
    if(token !== yearSummaryToken) return;
    renderYearSummary(events, yearRange);
  }catch(err){
    if(token === yearSummaryToken){
      console.error(err);
      resetYearSummary('No se pudo cargar el resumen anual.');
    }
  }
}

async function loadWeek({ force=false } = {}){
  monthSummaryToken++;
  yearSummaryToken++;
  if(week){
    setMonthSummaryLoading(getMonthRange(week.start));
    setYearSummaryLoading(getYearRange(week.start));
  }
  const token = ++weekRequestToken;
  try{
    const events = await loadIcsEvents(force).then(()=> fetchEventsForRange(week));
    if(token !== weekRequestToken) return;
    render(events);
  }catch(err){
    if(token === weekRequestToken){
      console.error(err);
      const extra = err?.message ? `\n${err.message}` : '';
      alert(`No se pudieron cargar los eventos de la semana.${extra}`);
      resetMonthSummary();
      resetYearSummary();
    }
    return;
  }
  if(token === weekRequestToken){
    loadMonthSummary();
    loadYearSummary();
  }
}

// ======== RENDER ========
function render(events){
  const now = new Date();
  processedWeekEvents = processEventsCollection(events, now);
  const summary = summarizeProcessedEvents(processedWeekEvents);
  updateWeeklyStats(summary);
  applyFilters();
  updateUpcomingSessions();
}

function updateWeeklyStats(summary){
  if(weekHoursEl) weekHoursEl.textContent = formatHoursDecimal(summary.dadasMinutes);
  if(weekDadasEl) weekDadasEl.textContent = String(summary.dadas);
  if(weekAusenciasEl) weekAusenciasEl.textContent = String(summary.ausencias);
  if(weekProgramadasEl) weekProgramadasEl.textContent = String(summary.programadas);
  if(weekEnCursoEl) weekEnCursoEl.textContent = `En curso: ${summary.enCurso}`;
  if(weekOtrosEl) weekOtrosEl.textContent = String(summary.otros);
  if(weekGinesEl) weekGinesEl.textContent = String(summary.gines);
  if(weekBormujosEl) weekBormujosEl.textContent = String(summary.bormujos);
  if(weekPrivadoEl) weekPrivadoEl.textContent = String(summary.privado);
  const availableMinutes = Number(cfg.minutesAvailable)||0;
  if(hoursLabelEl) hoursLabelEl.textContent = formatHoursPair(summary.sessionMinutes, availableMinutes);
}

function refreshStoredSummaries(){
  if(lastMonthSummaryData){
    const { summary, range } = lastMonthSummaryData;
    const availableMinutes = minutesAvailableForRange(range);
    monthHoursValueEl.textContent = formatHoursDecimal(summary.dadasMinutes);
    monthHoursLabelEl.textContent = availableMinutes > 0 ? formatHoursPair(summary.dadasMinutes, availableMinutes) : formatHoursDecimal(summary.dadasMinutes);
  }
  if(lastYearSummaryData){
    const { summary, range } = lastYearSummaryData;
    const availableMinutes = minutesAvailableForRange(range);
    yearHoursValueEl.textContent = formatHoursDecimal(summary.dadasMinutes);
    yearHoursLabelEl.textContent = availableMinutes > 0 ? formatHoursPair(summary.dadasMinutes, availableMinutes) : formatHoursDecimal(summary.dadasMinutes);
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
      tdDuracion.textContent = formatHoursDecimal(item.mins);
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
  const subtotalSessionLabel = formatHoursDecimal(subtotal.dadasMinutes);
  const subtotalTotalLabel = formatHoursDecimal(subtotal.totalMinutes);
  cell4.textContent = `Horas impartidas: ${subtotalSessionLabel} · Duración total: ${subtotalTotalLabel}`;
  subtotalRow.appendChild(cell1);
  subtotalRow.appendChild(cell2);
  subtotalRow.appendChild(cell3);
  subtotalRow.appendChild(cell4);
  tbody.appendChild(subtotalRow);
}

function updateUpcomingSessions(){
  if(!upcomingListEl) return;
  const allEvents = Array.isArray(cachedIcsEvents) ? cachedIcsEvents : [];
  const now = new Date();
  if(!allEvents.length){
    upcomingListEl.innerHTML = '';
    const empty = document.createElement('li');
    empty.className = 'upcoming-empty';
    empty.textContent = 'Añade tu URL iCal en Ajustes para ver las próximas sesiones.';
    upcomingListEl.appendChild(empty);
    if(upcomingInfoEl) upcomingInfoEl.textContent = 'Sin datos';
    return;
  }
  const processed = processEventsCollection(allEvents, now);
  const upcoming = processed
    .filter(item=> item.tipo === 'sesión' && item.estadoKey !== 'ausencia' && item.end >= now)
    .sort((a,b)=> a.start - b.start)
    .slice(0, 5);
  upcomingListEl.innerHTML = '';
  if(upcoming.length === 0){
    const empty = document.createElement('li');
    empty.className = 'upcoming-empty';
    empty.textContent = 'No hay sesiones pendientes.';
    upcomingListEl.appendChild(empty);
    if(upcomingInfoEl) upcomingInfoEl.textContent = 'Sin sesiones pendientes';
    return;
  }
  if(upcomingInfoEl){
    upcomingInfoEl.textContent = `${upcoming.length} próximas sesiones`;
  }
  upcoming.forEach(item=>{
    const li = document.createElement('li');
    li.className = 'upcoming-item';
    const title = document.createElement('strong');
    title.textContent = item.title;
    li.appendChild(title);
    const meta = document.createElement('div');
    meta.className = 'upcoming-meta';
    const dateSpan = document.createElement('span');
    dateSpan.textContent = fmtDate(item.start);
    meta.appendChild(dateSpan);
    if(item.isAllDay){
      const allDay = document.createElement('span');
      allDay.textContent = 'Todo el día';
      meta.appendChild(allDay);
    }else{
      const timeSpan = document.createElement('span');
      timeSpan.textContent = `${fmtTime(item.start)} · ${formatDuration(item.mins, { compact: true })}`;
      meta.appendChild(timeSpan);
    }
    if(item.centroLabel && item.centroLabel !== '—'){
      const centroSpan = document.createElement('span');
      centroSpan.textContent = item.centroLabel;
      meta.appendChild(centroSpan);
    }
    li.appendChild(meta);
    upcomingListEl.appendChild(li);
  });
}

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
updateUpcomingSessions();

function exportWeekToCsv(){
  if(!filteredWeekEvents.length){
    alert('No hay eventos para exportar con el filtro actual.');
    return;
  }
  const rows = [['Fecha','Inicio','Fin','Título','Centro','Estado','Tipo','Duración (h)']];
  filteredWeekEvents.forEach(item=>{
    const durationHours = formatHoursDecimal(item.mins).replace(/\s*h$/, '');
    rows.push([
      fmtDate(item.start),
      item.isAllDay ? '—' : fmtTime(item.start),
      item.isAllDay ? '—' : fmtTime(item.end),
      item.title,
      item.centroLabel || '—',
      item.estadoLabel,
      capitalize(item.tipo),
      durationHours
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
  document.body.classList.add('print-friendly');
  setTimeout(()=>{ window.print(); }, 50);
  setTimeout(()=> document.body.classList.remove('print-friendly'), 1000);
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
window.addEventListener('afterprint', ()=> document.body.classList.remove('print-friendly'));

function activateTab(tabId){
  if(!tabId) return;
  tabButtons.forEach(btn=>{
    const isActive = btn.dataset.tab === tabId;
    btn.classList.toggle('active', isActive);
  });
  tabContents.forEach(section=>{
    const isActive = section.id === tabId;
    section.classList.toggle('active', isActive);
    section.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });
}

const defaultTab = document.querySelector('.tab-btn.active')?.dataset.tab || tabButtons[0]?.dataset.tab;
if(defaultTab){ activateTab(defaultTab); }

tabButtons.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    activateTab(btn.dataset.tab);
  });
});

refreshBtn?.addEventListener('click', ()=> loadWeek({ force: true }));
loadWeekBtn?.addEventListener('click', ()=> loadWeek({ force: true }));
prevWeekBtn?.addEventListener('click', ()=> changeWeekBy(-7));
nextWeekBtn?.addEventListener('click', ()=> changeWeekBy(7));
todayWeekBtn?.addEventListener('click', ()=> setWeekFromDate(new Date()));
weekPicker?.addEventListener('change', (event)=>{
  const value = event.target.value;
  const date = parseDateInputValue(value);
  if(date) setWeekFromDate(date);
});

$('#save-cfg').addEventListener('click', ()=>{
  const inputValue = Number(hoursInputEl?.value || 0);
  const sanitizedHours = Number.isFinite(inputValue) && inputValue >= 0 ? inputValue : 0;
  cfg.hoursAvailable = sanitizedHours;
  cfg.minutesAvailable = Math.round(sanitizedHours * 60);
  localStorage.setItem('hoursAvailable', String(sanitizedHours));
  localStorage.setItem('minutesAvailable', String(cfg.minutesAvailable));
  if(hoursInputEl){
    hoursInputEl.value = trimTrailingZeros(sanitizedHours.toFixed(2));
  }
  if(processedWeekEvents.length){
    updateWeeklyStats(summarizeProcessedEvents(processedWeekEvents));
  }
  refreshStoredSummaries();
});

saveIcalBtn?.addEventListener('click', async ()=>{
  const url = (icalInputEl?.value || '').trim();
  if(!url){
    alert('Introduce una URL iCal válida.');
    return;
  }
  try{
    await loadIcsEvents(true);
    await loadWeek();
    alert('URL iCal guardada y calendario actualizado.');
  }catch(err){
    console.error(err);
    const extra = err?.message ? `\n${err.message}` : '';
    alert(`No se pudo cargar el iCal proporcionado.${extra}`);
  }
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

window.addEventListener('load', ()=>{
  if(cfg.icalUrl){
    loadWeek();
  }else{
    activateTab('tab-settings');
  }
});

