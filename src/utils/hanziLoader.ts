import HanziWriter from 'hanzi-writer';

const CACHE_PREFIX = 'tiengtrung_stroke_cache_';

/**
 * Custom character data loader that caches stroke definitions in localStorage
 * allowing 100% offline usage once a character has been viewed or saved.
 */
export const cachedCharDataLoader = (
  char: string, 
  onComplete: (data: any) => void, 
  onError: (err: any) => void
) => {
  const cacheKey = `${CACHE_PREFIX}${char}`;

  // 1. Try local cache first
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.strokes && parsed.medians) {
        onComplete(parsed);
        return;
      }
    }
  } catch (e) {
    // Ignore localStorage parse error
  }

  // 2. Fetch from CDN with timeout and fallback
  fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${char}.json`)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status} when fetching character stroke data`);
      }
      return res.json();
    })
    .then((data) => {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (e) {
        // Quota exceeded or private browsing
      }
      onComplete(data);
    })
    .catch((err) => {
      console.warn(`[cachedCharDataLoader] Could not load online stroke data for "${char}":`, err);
      onError(err);
    });
};

/**
 * Promise-based loader using the cached loader
 */
export async function getCharacterStrokeData(character: string): Promise<any> {
  const cacheKey = `${CACHE_PREFIX}${character}`;

  // Check cache first
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.strokes && parsed.medians) {
        return parsed;
      }
    }
  } catch (e) {}

  try {
    const data = await HanziWriter.loadCharacterData(character, {
      charDataLoader: cachedCharDataLoader
    });
    return data;
  } catch (err) {
    // Fallback direct load
    return HanziWriter.loadCharacterData(character);
  }
}
