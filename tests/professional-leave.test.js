const fs=require('fs'), vm=require('vm'), assert=require('assert');
const noop=()=>{};
function el(){ return {textContent:'',value:'',disabled:false,dataset:{},style:{},className:'',classList:{add:noop,remove:noop,toggle:noop},setAttribute:noop,removeAttribute:noop,addEventListener:noop,appendChild:noop,removeChild:noop,querySelectorAll:()=>[],closest:()=>null}; }
const elements=new Map();
const document={querySelector:(s)=>{if(!elements.has(s)) elements.set(s,el()); return elements.get(s)},querySelectorAll:()=>[],createElement:()=>el(),documentElement:{style:{setProperty:noop}},body:el()};
const storage=new Map();
const context={console,document,localStorage:{getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,v)},window:{setTimeout:noop,addEventListener:noop,print:noop},setTimeout:noop,clearTimeout:noop,URL,URLSearchParams,Blob,fetch:noop,google:undefined};
vm.createContext(context); vm.runInContext(fs.readFileSync('main.js','utf8'),context);
const run=(code)=>vm.runInContext(code,context);
const marker=(summary='Permiso por matrimonio',start='2026-09-03',end='2026-09-23')=>({summary,start:{date:start},end:{date:end}});
const session=(summary,date,description='')=>({summary,description,start:{dateTime:`${date}T10:00:00+02:00`},end:{dateTime:`${date}T10:45:00+02:00`}});
function processed(events,now='2026-09-30T00:00:00+02:00'){context.__events=events; context.__now=new Date(now); return run('processEventsCollection(__events,__now)');}
let p=processed([marker(),session('* 12345 Nombre (G)','2026-09-03'),session('* 23456 Nombre (B)','2026-09-22'),session('* 34567 Nombre (P)','2026-09-10')]);
assert.deepStrictEqual(Array.from(p,x=>x.estadoKey),['permiso_profesional','permiso_profesional','permiso_profesional']);
assert.strictEqual(p.some(x=>x.title==='Permiso por matrimonio'),false);
let s; context.__list=p; s=run('summarizeProcessedEvents(__list)');
assert.equal(s.permisosProfesionales,3); assert.equal(s.dadas,0); assert.equal(s.ausencias,0); assert.equal(s.programadas,0); assert.equal(s.enCurso,0); assert.equal(s.sessionMinutes,0); assert.equal(s.scheduledSessionMinutes,0); assert.equal(s.privadoAusenciasJustificadas,0); assert.equal(s.privadoAusenciasNoJustificadas,0);
p=processed([marker(),session('12345 Nombre (G)','2026-09-10')]); assert.equal(p[0].estadoKey,'dada');
p=processed([marker(),session('* 12345 Nombre (G)','2026-09-23'),session('* 34567 Nombre (P)','2026-09-24','justificada')]); assert.deepStrictEqual(Array.from(p,x=>x.estadoKey),['ausencia','ausencia']); assert.equal(p[1].privateAbsenceJustified,true);
p=processed([marker(' Recordatorio permiso por matrimonio '),session('* 12345 Nombre (G)','2026-09-10')]); assert.equal(p[0].estadoKey,'ausencia');
p=processed([marker('  PERMISO POR MATRIMONIO  '),session('* 12345 Nombre (G)','2026-09-22')]); assert.equal(p[0].estadoKey,'permiso_profesional');
p=processed([marker(),marker('Recepción', '2026-09-10','2026-09-12'),session('* 12345 Nombre (G)','2026-09-10')]); assert.equal(p.length,1); assert.equal(p[0].estadoKey,'permiso_profesional');
context.__range={start:new Date('2026-09-01T00:00:00'),end:new Date('2026-10-01T00:00:00')}; context.__events=[marker()];
const withMarker=run('minutesAvailableForRange(__range,__events)'), withoutMarker=run('minutesAvailableForRange(__range,[])'); assert.equal(withMarker,withoutMarker); assert.equal(withMarker,9240);
const timedAbsences=['festivo','vacaciones','baja'].map((summary,index)=>({summary,start:{dateTime:`2026-09-${String(index+7).padStart(2,'0')}T09:00:00+02:00`},end:{dateTime:`2026-09-${String(index+7).padStart(2,'0')}T10:00:00+02:00`}}));
context.__events=timedAbsences; assert.equal(run('calculateAbsenceReductionMinutes(__events,__range)'),180);
const privateVacation=processed([session('* 34567 Nombre (P)','2026-09-24','vacaciones')]); assert.equal(privateVacation.length,0);
console.log('11 casos de permiso profesional y regresión validados');
