import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import en from '../locales/en.js'
import fr from '../locales/fr.js'
import ar from '../locales/ar.js'

/**
 * Translation, deliberately small.
 *
 * Three languages and a few hundred strings do not need a framework: the whole
 * of i18next is 40kB to do what `t('a.b')` and a nested object do here. What
 * this does keep from the grown-up libraries is the part that matters —
 * English is always the fallback, key by key, so a half-finished translation
 * shows English where it is missing rather than the key itself or a blank.
 */
const STORAGE_KEY = 'cardfolio.lang'

/**
 * `short` is the badge form for a header that has no room for "Français".
 * Arabic's is a letter rather than a transliteration: "AR" is only meaningful
 * to someone who already reads the Latin alphabet, and ع is the language
 * naming itself, which is the same principle as `name` below.
 */
export const LANGUAGES = [
  { code: 'en', name: 'English', short: 'EN', dir: 'ltr' },
  { code: 'fr', name: 'Français', short: 'FR', dir: 'ltr' },
  { code: 'ar', name: 'العربية', short: 'ع', dir: 'rtl' },
]

const DICTIONARIES = { en, fr, ar }

const I18nContext = createContext(null)

/**
 * The starting language: a stored choice, else the browser's, else English.
 *
 * The browser is consulted only as a first guess. Once someone picks from the
 * switcher their choice is stored and the browser is never asked again — the
 * person in the room outranks the setting on their machine.
 */
function initialLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (DICTIONARIES[stored]) return stored
  } catch {
    /* private mode — fall through to detection */
  }

  const preferred = typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : []
  for (const tag of preferred) {
    const base = String(tag || '').slice(0, 2).toLowerCase()
    if (DICTIONARIES[base]) return base
  }
  return 'en'
}

/**
 * Applies the language to the document.
 *
 * Called once at module load as well as from the provider's effect, because
 * effects run after the first paint — and by then a right-to-left layout has
 * already been measured as left-to-right by anything that measures on mount.
 * The hero's phone travels a distance computed from where it rests, so a beat
 * of wrong direction is a phone that centres itself off the wrong edge.
 */
function applyDocumentLanguage(lang, dir) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang
  document.documentElement.dir = dir
}

/** Walks "settings.cardUrl" through a dictionary. Undefined when absent. */
function lookup(dictionary, path) {
  return path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), dictionary)
}

/** Fills {name}-style holes. Missing values leave the placeholder visible. */
function interpolate(template, values) {
  if (!values) return template
  return template.replace(/\{(\w+)\}/g, (whole, key) => (key in values ? String(values[key]) : whole))
}

// Before anything renders: the first paint has to be in the right direction.
{
  const lang = initialLanguage()
  applyDocumentLanguage(lang, LANGUAGES.find((l) => l.code === lang)?.dir || 'ltr')
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLanguage)

  const dir = LANGUAGES.find((language) => language.code === lang)?.dir || 'ltr'

  /**
   * `lang` and `dir` on the document, because they are not decoration: they
   * decide hyphenation and quote marks, which voice a screen reader uses, and
   * — for Arabic — which side of the screen the whole layout starts from.
   */
  useEffect(() => {
    applyDocumentLanguage(lang, dir)
  }, [lang, dir])

  const setLang = useCallback((next) => {
    if (!DICTIONARIES[next]) return
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* private mode — the choice lasts for this session only */
    }
  }, [])

  const t = useCallback(
    (path, values) => {
      const translated = lookup(DICTIONARIES[lang], path)
      const text = typeof translated === 'string' ? translated : lookup(en, path)
      // The key itself is the last resort: it is ugly on purpose, because a
      // missing string should be obvious in review rather than blank on screen.
      if (typeof text !== 'string') return path
      return interpolate(text, values)
    },
    [lang]
  )

  /**
   * The same lookup as `t`, without the string coercion.
   *
   * Some content is a list rather than a sentence — the sections of the terms,
   * for instance. `t` would flatten those to their key; this returns them as
   * they are, still with the English fallback behind them.
   */
  const raw = useCallback(
    (path) => {
      const translated = lookup(DICTIONARIES[lang], path)
      return translated === undefined ? lookup(en, path) : translated
    },
    [lang]
  )

  const value = useMemo(
    () => ({ lang, dir, rtl: dir === 'rtl', setLang, t, raw }),
    [lang, dir, setLang, t, raw]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>')
  return value
}

/** Shorthand for the common case. */
export function useT() {
  return useI18n().t
}
