import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}
// todo:make toast smooth and add trasition effects
interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = uuidv4();
    const toast: Toast = { id, message, type, duration };
    setToasts((t) => [toast, ...t]);

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  const success = useCallback((message: string, duration?: number) => showToast(message, 'success', duration), [showToast]);
  const error = useCallback((message: string, duration?: number) => showToast(message, 'error', duration), [showToast]);
  const info = useCallback((message: string, duration?: number) => showToast(message, 'info', duration), [showToast]);

  const value = useMemo(() => ({ showToast, success, error, info }), [showToast, success, error, info]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto w-80 max-w-sm rounded-lg shadow-lg overflow-hidden border border-border flex items-start gap-3 p-3 animate-slide-in transition-all
              ${t.type === 'success' ? 'bg-green-600 text-on-primary' : ''}
              ${t.type === 'error' ? 'bg-red-600 text-on-primary' : ''}
              ${t.type === 'info' ? 'bg-surface text-white' : ''}`}
          >
            <div className="flex-1 text-sm leading-tight">{t.message}</div>
            <div className="ml-2 flex items-start">
              <button
                onClick={() => removeToast(t.id)}
                className="text-current opacity-80 hover:opacity-100"
                aria-label="Dismiss"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
