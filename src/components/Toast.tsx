import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info', duration = 3500) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast, toasts, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4 sm:px-0">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastItemProps {
  key?: string;
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          border: 'border-emerald-500/30',
          bg: 'bg-zinc-950/95',
          icon: <CheckCircle2 className="text-emerald-400 shrink-0 stroke-[2.5]" size={18} />,
          shadow: 'shadow-[0_4px_20px_rgba(16,185,129,0.15)] shadow-emerald-500/5',
          line: 'bg-emerald-500',
        };
      case 'error':
        return {
          border: 'border-rose-500/30',
          bg: 'bg-zinc-950/95',
          icon: <AlertCircle className="text-rose-400 shrink-0 stroke-[2.5]" size={18} />,
          shadow: 'shadow-[0_4px_20px_rgba(244,63,94,0.15)] shadow-rose-500/5',
          line: 'bg-rose-500',
        };
      case 'info':
      default:
        return {
          border: 'border-blue-500/30',
          bg: 'bg-zinc-950/95',
          icon: <Info className="text-blue-400 shrink-0 stroke-[2.5]" size={18} />,
          shadow: 'shadow-[0_4px_20px_rgba(59,130,246,0.15)] shadow-blue-500/5',
          line: 'bg-blue-500',
        };
    }
  };

  const styles = getStyles();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border ${styles.border} ${styles.bg} p-4 ${styles.shadow} flex items-start gap-3.5 backdrop-blur-md`}
    >
      {/* Bottom sliding timeout indicator */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: (toast.duration || 3500) / 1000, ease: 'linear' }}
        className={`absolute bottom-0 left-0 h-1 ${styles.line}`}
      />

      {styles.icon}

      <div className="flex-1 text-sm font-semibold text-zinc-100 pr-4 leading-snug">
        {toast.message}
      </div>

      <button
        onClick={() => onRemove(toast.id)}
        className="text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg p-0.5 hover:bg-zinc-900 shrink-0"
      >
        <X size={15} />
      </button>
    </motion.div>
  );
}
