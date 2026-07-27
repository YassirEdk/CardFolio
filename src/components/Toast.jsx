import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Check, X, Info } from 'lucide-react'
import { cx } from './ui'

const ToastContext = createContext(() => {})

/** `const toast = useToast(); toast('Saved')` — auto-dismisses after 3s. */
export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message, tone = 'success') => {
      const id = ++nextId
      setToasts((current) => [...current, { id, message, tone }])
      setTimeout(() => dismiss(id), 3000)
    },
    [dismiss]
  )

  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-5 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-6 sm:translate-x-0"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="animate-toast-in flex items-center gap-3 rounded-md border border-navy-800 bg-navy-900 px-4 py-3 text-sm font-medium text-white shadow-[var(--shadow-lift)]"
          >
            <span
              className={cx(
                'grid h-5 w-5 shrink-0 place-items-center rounded-xs',
                toast.tone === 'success' ? 'bg-emerald-500' : 'bg-accent-500'
              )}
              aria-hidden="true"
            >
              {toast.tone === 'success' ? <Check size={13} strokeWidth={3} /> : <Info size={13} />}
            </span>
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="text-slate-400 transition-colors hover:text-white"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
