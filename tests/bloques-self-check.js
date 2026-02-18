const { normalizeTitle, parseBloqueHorarioTitle, UNIVERSAL_BLOCK_PATTERN } = require('../classification.js');

const shouldMatch = [
  'G10',
  'G 10',
  'g10',
  'Gin 8',
  'Gínes 8',
  'GINES8',
  'B9',
  'B 9',
  'B SALA 11',
  'B-sala-11',
  'Bormujos 10',
  'bormujos sala 7'
];

const shouldNotMatch = [
  'firma',
  'comida',
  'reunión',
  'ENT B 10',
  'GS: 1',
  'BS: 2'
];

const excludedPatterns = [
  '^G\\s*:?\\s*\\d+$',
  '^B\\s*:?\\s*\\d+$',
  '^ENT\\s*[BG]\\s*:?\\s*\\d+$',
  '^[BG]S\\s*:?\\s*\\d+$'
];

function fail(message){
  console.error(`❌ ${message}`);
  process.exit(1);
}

for(const sample of shouldMatch){
  const parsed = parseBloqueHorarioTitle(sample, UNIVERSAL_BLOCK_PATTERN);
  if(!parsed) fail(`No detectó bloque: "${sample}"`);
  if(parsed.type !== 'bloque') fail(`type inválido en "${sample}"`);
  if(!['gines', 'bormujos'].includes(parsed.centro)) fail(`centro inválido en "${sample}"`);
  if(!Number.isInteger(parsed.sala)) fail(`sala inválida en "${sample}"`);
}

for(const sample of shouldNotMatch){
  const parsed = parseBloqueHorarioTitle(sample, UNIVERSAL_BLOCK_PATTERN);
  if(parsed) fail(`Detectó como bloque algo que no debía: "${sample}"`);
}

const exclusionRegexes = excludedPatterns.map((source)=> new RegExp(source, 'i'));
['ENT B 10', 'GS: 1', 'BS: 2'].forEach((sample)=>{
  const normalized = normalizeTitle(sample);
  const isExcluded = exclusionRegexes.some((regex)=> regex.test(normalized));
  if(!isExcluded){
    fail(`No respeta exclusión esperada para "${sample}" (normalizado: "${normalized}")`);
  }
});

console.log('✅ Self-check de bloques superado');
