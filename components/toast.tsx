'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

// ─── 타입 ───
type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  toast: {
    success: (message: string) => void
    error: (message: string) => void
    warning: (message: string) => void
    info: (message: string) => void
  }
}

// ─── Context ───
const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// ─── 개별 토스트 UI ───
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onRemove(toast.id), 300)
    }, toast.duration || 3000)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => onRemove(toast.id), 300)
  }

  const config = {
    success: { icon: CheckCircle, bg: 'bg-green-50 dark:bg-green-950/50', border: 'border-green-200 dark:border-green-800', text: 'text-green-800 dark:text-green-200', iconColor: 'text-green-500' },
    error: { icon: XCircle, bg: 'bg-red-50 dark:bg-red-950/50', border: 'border-red-200 dark:border-red-800', text: 'text-red-800 dark:text-red-200', iconColor: 'text-red-500' },
    warning: { icon: AlertTriangle, bg: 'bg-amber-50 dark:bg-amber-950/50', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-800 dark:text-amber-200', iconColor: 'text-amber-500' },
    info: { icon: Info, bg: 'bg-blue-50 dark:bg-blue-950/50', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-800 dark:text-blue-200', iconColor: 'text-blue-500' },
  }

  const c = config[toast.type]
  const Icon = c.icon

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm max-w-sm w-full
        ${c.bg} ${c.border}
        transition-all duration-300 ease-in-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${c.iconColor}`} />
      <p className={`text-sm flex-1 ${c.text}`}>{toast.message}</p>
      <button onClick={handleClose} className={`flex-shrink-0 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 ${c.text} opacity-60 hover:opacity-100`}>
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Provider ───
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts(prev => [...prev, { id, type, message, duration }])
  }, [])

  const toast = {
    success: (message: string) => addToast('success', message),
    error: (message: string) => addToast('error', message, 5000),
    warning: (message: string) => addToast('warning', message, 4000),
    info: (message: string) => addToast('info', message),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* 토스트 컨테이너 - 우측 상단 */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
