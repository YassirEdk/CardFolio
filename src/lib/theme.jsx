import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Light and dark, with light as the product's default.
 *
 * Three settings rather than two: `system` follows the operating system, and
 * is offered because a person who has told their OS they want dark has already
 * answered this question once. It is not the default, though — the app is
 * designed light, and a visitor who has never expressed a preference here
 * should see the design as drawn.
 *
 * The chosen value is stored, not the resolved one: someone on `system` who
 * changes their OS setting at dusk expects the app to follow.
 */
const STORAGE_KEY = 'cardfolio.theme'

export const THEMES = ['light', 'dark', 'system']

const ThemeContext = createContext(null)

function readStored() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return THEMES.includes(stored) ? stored : 'light'
  } catch {
    return 'light'
  }
}

function prefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStored)
  const [systemDark, setSystemDark] = useState(prefersDark)

  // Only matters on `system`, but the listener is cheap and always correct.
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event) => setSystemDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  /**
   * The class the CSS keys off, plus `color-scheme` so form controls,
   * scrollbars and the space behind a rubber-band scroll are dark too — the
   * details that otherwise flash white around a dark page.
   */
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolved === 'dark')
    root.style.colorScheme = resolved
  }, [resolved])

  const setTheme = useCallback((next) => {
    setThemeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* private mode — the choice lasts for this session only */
    }
  }, [])

  /** What a single toggle should do: flip what you can currently see. */
  const toggle = useCallback(() => {
    setTheme(resolved === 'dark' ? 'light' : 'dark')
  }, [resolved, setTheme])

  const value = useMemo(
    () => ({ theme, resolved, isDark: resolved === 'dark', setTheme, toggle }),
    [theme, resolved, setTheme, toggle]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>')
  return value
}
