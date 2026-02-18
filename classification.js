(function(globalScope){
  const UNIVERSAL_BLOCK_PATTERN = '^(G|GIN|GINES|B|BORMUJOS)\\s*(?:SALA\\s*)?(\\d{1,2})$';

  function normalizeTitle(value){
    return String(value || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[._\-/]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function mapCentro(rawCentro){
    const token = String(rawCentro || '').toUpperCase();
    if(token === 'G' || token === 'GIN' || token === 'GINES') return 'gines';
    if(token === 'B' || token === 'BORMUJOS') return 'bormujos';
    return null;
  }

  function parseBloqueHorarioTitle(title, patternSource = UNIVERSAL_BLOCK_PATTERN){
    const raw = String(title || '');
    const normalized = normalizeTitle(raw);
    if(!normalized) return null;

    let regex;
    try{
      regex = new RegExp(patternSource, 'i');
    }catch(_err){
      regex = new RegExp(UNIVERSAL_BLOCK_PATTERN, 'i');
    }

    const match = normalized.match(regex);
    if(!match) return null;

    const centro = mapCentro(match[1]);
    const sala = Number.parseInt(match[2], 10);
    if(!centro || !Number.isInteger(sala)) return null;

    return {
      type: 'bloque',
      centro,
      sala,
      raw,
      normalized
    };
  }

  const api = {
    UNIVERSAL_BLOCK_PATTERN,
    normalizeTitle,
    parseBloqueHorarioTitle
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = api;
  }
  globalScope.ClassificationUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
