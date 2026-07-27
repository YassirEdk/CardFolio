import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setToken, getToken } from './api'

const AuthContext = createContext(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}

/**
 * Holds the signed-in user and their card. The token lives in localStorage so
 * a refresh keeps you signed in; on boot we revalidate it against /auth/me.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [card, setCard] = useState(null)
  const [status, setStatus] = useState(getToken() ? 'loading' : 'anonymous')

  useEffect(() => {
    if (!getToken()) return
    let active = true
    api
      .me()
      .then(({ user: u, card: c }) => {
        if (!active) return
        setUser(u)
        setCard(c)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!active) return
        setToken(null)
        setStatus('anonymous')
      })
    return () => {
      active = false
    }
  }, [])

  const adopt = useCallback((payload) => {
    setToken(payload.token)
    setUser(payload.user)
    setCard(payload.card)
    setStatus('authenticated')
    return payload
  }, [])

  const login = useCallback(async (credentials) => adopt(await api.login(credentials)), [adopt])
  const signup = useCallback(async (data) => adopt(await api.signup(data)), [adopt])
  const loginWithGoogle = useCallback(
    async (credential, mode) => adopt(await api.google(credential, mode)),
    [adopt]
  )

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    setCard(null)
    setStatus('anonymous')
  }, [])

  const saveCard = useCallback(async (patch) => {
    const updated = await api.updateCard(patch)
    setCard(updated)
    return updated
  }, [])

  /** Deletes the account, then clears the session exactly as logout does. */
  const deleteAccount = useCallback(async () => {
    await api.deleteAccount()
    setToken(null)
    setUser(null)
    setCard(null)
    setStatus('anonymous')
  }, [])

  /** Account preferences come back as a fresh user, same as a plan change. */
  const savePrefs = useCallback(async (prefs) => {
    const updated = await api.setPrefs(prefs)
    setUser(updated)
    return updated
  }, [])

  /** Plan changes come back as a fresh user, so the UI unlocks immediately. */
  const setPlan = useCallback(async (plan) => {
    const updated = await api.setPlan(plan)
    setUser(updated)
    return updated
  }, [])

  const value = useMemo(
    () => ({ user, card, status, login, signup, loginWithGoogle, logout, saveCard, setCard, setPlan, savePrefs, deleteAccount }),
    [user, card, status, login, signup, loginWithGoogle, logout, saveCard, setPlan, savePrefs, deleteAccount]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
