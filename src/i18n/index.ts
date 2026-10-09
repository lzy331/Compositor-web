import { useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { translations, HISTORY_KEY_MAP } from './translations';
import type { Language } from '@/types';

export type TFunc = (key: string, vars?: Record<string, string | number>) => string;

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  let out = text;
  for (const k of Object.keys(vars)) {
    out = out.split(`{${k}}`).join(String(vars[k]));
  }
  return out;
}

// Standalone translator (for non-React contexts, e.g. module-level helpers).
export function translate(lang: Language, key: string, vars?: Record<string, string | number>): string {
  const dict = translations[lang] || translations.en;
  const text = dict[key] ?? translations.en[key] ?? key;
  return interpolate(text, vars);
}

// React hook: re-renders the component when the language changes.
export function useT(): TFunc {
  const language = useEditorStore((s) => s.language);
  return useCallback<TFunc>(
    (key, vars) => translate(language, key, vars),
    [language]
  );
}

// Translate a raw history description into the current language.
export function translateHistory(lang: Language, description: string): string {
  const key = HISTORY_KEY_MAP[description];
  return key ? translate(lang, key) : description;
}

// Translate app-generated default layer names (e.g. "Background", "Layer 2",
// "... copy"). User-renamed layers are returned unchanged.
export function translateLayerName(lang: Language, name: string): string {
  let base = name;
  let isCopy = false;
  const suffix = ' copy';
  if (base.endsWith(suffix)) {
    isCopy = true;
    base = base.slice(0, -suffix.length);
  }
  let out = base;
  if (base === 'Background') {
    out = translate(lang, 'layer.background');
  } else {
    const m = /^Layer (\d+)$/.exec(base);
    if (m) out = translate(lang, 'layer.defaultName', { n: m[1] });
  }
  if (isCopy) out = out + ' ' + translate(lang, 'layer.copySuffix');
  return out;
}

export { translations, HISTORY_KEY_MAP };