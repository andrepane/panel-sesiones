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
const cfg = {
  minutesAvailable: Number(localStorage.getItem('minutesAvailable') || 2310),
  rules: JSON.parse(localStorage.getItem('rules') || '{}'),
  clientId: localStorage.getItem('clientId') || ''
};

const storedWeekStartIso = localStorage.getItem('weekStartISO') || '';

const weekPicker = $('#week-picker');
const weekDadasEl = $('#stat-dadas');
const weekAusenciasEl = $('#stat-ausencias');
const weekProgramadasEl = $('#stat-programadas');
const weekEnCursoEl = $('#stat-en-curso');
const weekOtrosEl = $('#stat-otros');
const weekGinesEl = $('#stat-gines');
const weekBormujosEl = $('#stat-bormujos');
const weekPrivadoEl = $('#stat-privado');
const minutesLabelEl = $('#minutes-label');
const pctLabelEl = $('#pct-label');
const progressBarEl = $('#progress-bar');
const monthDadasEl = $('#stat-month-dadas');
const monthAusenciasEl = $('#stat-month-ausencias');
const monthProgramadasEl = $('#stat-month-programadas');
const monthOtrosEl = $('#stat-month-otros');
const monthPctEl = $('#stat-month-pct');
const monthOccupancyEl = $('#stat-month-occupancy');
const monthLabelEl = $('#month-label');
const monthMinutesLabelEl = $('#month-occupancy-label');
const yearDadasEl = $('#stat-year-dadas');
const yearAusenciasEl = $('#stat-year-ausencias');
const yearProgramadasEl = $('#stat-year-programadas');
const yearOtrosEl = $('#stat-year-otros');
const yearPctEl = $('#stat-year-pct');
const yearOccupancyEl = $('#stat-year-occupancy');
const yearLabelEl = $('#year-label');
const yearMinutesLabelEl = $('#year-occupancy-label');
const baseDateLabelEl = $('#base-date-label');
const loadingIndicatorEl = $('#loading-indicator');
const statusFiltersEl = $('#status-filters');
const centerFiltersEl = $('#center-filters');
const exportCsvBtn = $('#export-csv');
const printViewBtn = $('#print-view');

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

const MINUTES_PER_SESSION = 45;
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

function minutesAvailableForRange(range){
  const weeklyMinutes = Number(cfg.minutesAvailable) || 0;
  if(!range || weeklyMinutes <= 0) return 0;
  const diffMs = Math.max(0, range.end - range.start);
  return weeklyMinutes * (diffMs / WEEK_IN_MS);
}

function computeOccupancyPercent(minutesUsed, minutesAvailable){
  if(!Number.isFinite(minutesUsed) || !Number.isFinite(minutesAvailable) || minutesAvailable <= 0){
    return null;
  }
  return (minutesUsed / minutesAvailable) * 100;
}

function formatPercent(value){
  if(!Number.isFinite(value) || value < 0){
    return '–';
  }
  const fixed = value.toFixed(1);
  return `${fixed.replace(/\.0$/, '')}%`;
}

function formatMinutes(value){
  if(!Number.isFinite(value) || value < 0) return '–';
  const rounded = Math.round(value);
  if(Math.abs(rounded - value) < 0.05){
    return String(rounded);
  }
  return value.toFixed(1).replace(/\.0$/, '');
}

function formatMinutesPair(used, available){
  const usedText = formatMinutes(used);
  const availableText = (Number.isFinite(available) && available > 0) ? formatMinutes(available) : '–';
  if(usedText === '–' && availableText === '–') return '—';
  if(availableText === '–') return `${usedText} / – min`;
  return `${usedText} / ${availableText} min`;
}

let week = null;
let weekRequestToken = 0;
let monthSummaryToken = 0;
let yearSummaryToken = 0;

function updateWeekUI(){
  if(!week) return;
  const start = week.start;
  const end = new Date(week.end - 1);
  $('#week-label').textContent = `Del ${fmtDate(start)} al ${fmtDate(end)}`;
  $('#range-label').textContent = `Consulta semanal (timeMin/timeMax): ${week.start.toISOString()} → ${week.end.toISOString()}`;
  if(baseDateLabelEl){
    baseDateLabelEl.textContent = `Rango local: ${fmtDate(start)} 00:00 → ${fmtDate(end)} 23:59 (${TZ})`;
  }
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
  monthProgramadasEl.textContent = '–';
  monthOtrosEl.textContent = '–';
  monthPctEl.textContent = '–';
  monthOccupancyEl.textContent = '–';
  monthLabelEl.textContent = text;
  monthMinutesLabelEl.textContent = '—';
}

function setMonthSummaryLoading(range){
  monthDadasEl.textContent = '…';
  monthAusenciasEl.textContent = '…';
  monthProgramadasEl.textContent = '…';
  monthOtrosEl.textContent = '…';
  monthPctEl.textContent = '…';
  monthOccupancyEl.textContent = '…';
  monthLabelEl.textContent = range ? `Cargando ${formatMonthRangeText(range)}...` : 'Cargando resumen mensual...';
  monthMinutesLabelEl.textContent = '…';
}

function resetYearSummary(text='—'){
  yearDadasEl.textContent = '–';
  yearAusenciasEl.textContent = '–';
  yearProgramadasEl.textContent = '–';
  yearOtrosEl.textContent = '–';
  yearPctEl.textContent = '–';
  yearOccupancyEl.textContent = '–';
  yearLabelEl.textContent = text;
  yearMinutesLabelEl.textContent = '—';
}

function setYearSummaryLoading(range){
  yearDadasEl.textContent = '…';
  yearAusenciasEl.textContent = '…';
  yearProgramadasEl.textContent = '…';
  yearOtrosEl.textContent = '…';
  yearPctEl.textContent = '…';
  yearOccupancyEl.textContent = '…';
  yearLabelEl.textContent = range ? `Cargando ${formatYearRangeText(range)}...` : 'Cargando resumen anual...';
  yearMinutesLabelEl.textContent = '…';
}

function cloneRules(rules){
  return JSON.parse(JSON.stringify(rules));
}

if(!cfg.rules || !cfg.rules.centros){ cfg.rules = cloneRules(DEFAULT_RULES); }

$('#cfg-minutes').value = cfg.minutesAvailable;
$('#clientId').value = cfg.clientId;
$('#rules-json').textContent = JSON.stringify(cfg.rules, null, 2);

const initialWeekDate = storedWeekStartIso ? new Date(storedWeekStartIso) : new Date();
week = getWeekRange(Number.isNaN(initialWeekDate.getTime()) ? new Date() : initialWeekDate);
updateWeekUI();
resetMonthSummary();
resetYearSummary();

// ======== AUTH (GIS Token Client) ========
let tokenClient = null; let accessToken = null; let calendars = [];

function initTokenClient(){
  const clientId = $('#clientId').value.trim();
  if(!clientId){ alert('Introduce tu Google OAuth CLIENT_ID'); return; }
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    prompt: '',
    callback: (resp)=>{
      if(resp && resp.access_token){ accessToken = resp.access_token; loadCalendars(); }
      else alert('No se obtuvo access_token');
    }
  });
}

async function loadCalendars(){
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
    if(calendars.length){ loadWeek(); }
  }catch(err){
    console.error(err);
    alert('No se pudieron cargar los calendarios. Revisa la consola para más detalles.');
  }finally{
    hideLoading();
  }
}

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
    totalMinutes: 0
  };
  list.forEach(item=>{
    summary.totalMinutes += item.mins;
    switch(item.estadoKey){
      case 'dada':
        summary.dadas++;
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
  summary.sessionMinutes = summary.dadas * MINUTES_PER_SESSION;
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
  const occupancy = computeOccupancyPercent(summary.sessionMinutes, availableMinutes);
  const programadasTexto = summary.enCurso > 0 ? `${summary.programadas} (+${summary.enCurso} en curso)` : String(summary.programadas);

  monthDadasEl.textContent = String(summary.dadas);
  monthAusenciasEl.textContent = String(summary.ausencias);
  monthProgramadasEl.textContent = programadasTexto;
  monthOtrosEl.textContent = String(summary.otros);
  const pct = totalSesiones > 0 ? (summary.dadas / totalSesiones) * 100 : null;
  monthPctEl.textContent = formatPercent(pct);
  monthOccupancyEl.textContent = formatPercent(occupancy);
  const extras = summary.totalEventos > 0 ? ` · Total eventos: ${summary.totalEventos}` : '';
  const enCursoText = summary.enCurso > 0 ? ` · En curso: ${summary.enCurso}` : '';
  monthLabelEl.textContent = `${formatMonthRangeText(range)}${extras}${enCursoText}`;
  monthMinutesLabelEl.textContent = availableMinutes > 0 ? formatMinutesPair(summary.sessionMinutes, availableMinutes) : '—';
}

function renderYearSummary(events, range){
  const processed = processEventsCollection(events, new Date());
  const summary = summarizeProcessedEvents(processed);
  const totalSesiones = summary.dadas + summary.ausencias;
  const availableMinutes = minutesAvailableForRange(range);
  const occupancy = computeOccupancyPercent(summary.sessionMinutes, availableMinutes);
  const programadasTexto = summary.enCurso > 0 ? `${summary.programadas} (+${summary.enCurso} en curso)` : String(summary.programadas);

  yearDadasEl.textContent = String(summary.dadas);
  yearAusenciasEl.textContent = String(summary.ausencias);
  yearProgramadasEl.textContent = programadasTexto;
  yearOtrosEl.textContent = String(summary.otros);
  const pct = totalSesiones > 0 ? (summary.dadas / totalSesiones) * 100 : null;
  yearPctEl.textContent = formatPercent(pct);
  yearOccupancyEl.textContent = formatPercent(occupancy);
  const extras = summary.totalEventos > 0 ? ` · Total eventos: ${summary.totalEventos}` : '';
  const enCursoText = summary.enCurso > 0 ? ` · En curso: ${summary.enCurso}` : '';
  yearLabelEl.textContent = `${formatYearRangeText(range)}${extras}${enCursoText}`;
  yearMinutesLabelEl.textContent = availableMinutes > 0 ? formatMinutesPair(summary.sessionMinutes, availableMinutes) : '—';
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
  processedWeekEvents = processEventsCollection(events, now);
  const summary = summarizeProcessedEvents(processedWeekEvents);
  updateWeeklyStats(summary);
  applyFilters();
}

function updateWeeklyStats(summary){
  if(weekDadasEl) weekDadasEl.textContent = String(summary.dadas);
  if(weekAusenciasEl) weekAusenciasEl.textContent = String(summary.ausencias);
  if(weekProgramadasEl) weekProgramadasEl.textContent = String(summary.programadas);
  if(weekEnCursoEl) weekEnCursoEl.textContent = `En curso: ${summary.enCurso}`;
  if(weekOtrosEl) weekOtrosEl.textContent = String(summary.otros);
  if(weekGinesEl) weekGinesEl.textContent = String(summary.gines);
  if(weekBormujosEl) weekBormujosEl.textContent = String(summary.bormujos);
  if(weekPrivadoEl) weekPrivadoEl.textContent = String(summary.privado);
  const available = Number(cfg.minutesAvailable)||0;
  const occupancy = computeOccupancyPercent(summary.sessionMinutes, available);
  const pctText = formatPercent(occupancy);
  const pctForBar = occupancy == null ? 0 : Math.max(0, Math.min(100, occupancy));
  if(minutesLabelEl) minutesLabelEl.textContent = formatMinutesPair(summary.sessionMinutes, available);
  if(pctLabelEl) pctLabelEl.textContent = pctText;
  if(progressBarEl) progressBarEl.style.width = pctForBar + '%';
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
      tdDuracion.textContent = `${item.mins} min`;
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
  cell4.textContent = `Min dadas: ${formatMinutes(subtotal.sessionMinutes)} · Min totales: ${formatMinutes(subtotal.totalMinutes)}`;
  subtotalRow.appendChild(cell1);
  subtotalRow.appendChild(cell2);
  subtotalRow.appendChild(cell3);
  subtotalRow.appendChild(cell4);
  tbody.appendChild(subtotalRow);
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

function exportWeekToCsv(){
  if(!filteredWeekEvents.length){
    alert('No hay eventos para exportar con el filtro actual.');
    return;
  }
  const rows = [['Fecha','Inicio','Fin','Título','Centro','Estado','Tipo','Duración (min)']];
  filteredWeekEvents.forEach(item=>{
    rows.push([
      fmtDate(item.start),
      item.isAllDay ? '—' : fmtTime(item.start),
      item.isAllDay ? '—' : fmtTime(item.end),
      item.title,
      item.centroLabel || '—',
      item.estadoLabel,
      capitalize(item.tipo),
      String(item.mins)
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

$('#signin').addEventListener('click', ()=>{
  localStorage.setItem('clientId', $('#clientId').value.trim());
  initTokenClient();
  tokenClient?.requestAccessToken();
});

$('#refresh').addEventListener('click', ()=>{
  if(accessToken){
    loadCalendars();
  }else{
    initTokenClient();
    tokenClient?.requestAccessToken();
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

$('#save-cfg').addEventListener('click', ()=>{
  const m = Number($('#cfg-minutes').value||0);
  cfg.minutesAvailable = m;
  localStorage.setItem('minutesAvailable', String(m));
  if(processedWeekEvents.length){
    updateWeeklyStats(summarizeProcessedEvents(processedWeekEvents));
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

// Autocarga si ya hay token en memoria del navegador (GIS puede reutilizar sesión)
window.addEventListener('load', ()=>{
  if(cfg.clientId){ initTokenClient(); }
});

