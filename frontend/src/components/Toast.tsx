import React, { createContext, useContext, useState, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
      <style>{`
        .toast-container {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 12px;
          pointer-events: none;
          max-width: 380px;
          width: 100%;
        }
        .toast-item {
          pointer-events: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-radius: 12px;
          background: var(--bg-card-glass, rgba(255, 255, 255, 0.9));
          border: 1px solid var(--border-gold);
          color: var(--text-dark);
          box-shadow: var(--shadow-gold), 0 10px 30px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(12px);
          font-size: 0.95rem;
          font-weight: 500;
          line-height: 1.4;
          animation: toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transition: all 0.3s ease;
        }
        .toast-content {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .toast-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
        }
        .toast-close {
          background: none;
          border: none;
          color: var(--text-muted-dark);
          cursor: pointer;
          font-size: 1.1rem;
          padding: 0;
          margin-left: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        .toast-close:hover {
          opacity: 1;
          color: var(--text-dark);
        }
        @keyframes toast-slide-in {
          from {
            transform: translateX(100%) translateY(-10px);
            opacity: 0;
          }
          to {
            transform: translateX(0) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return '✨';
      case 'error': return '⚠️';
      case 'info': return 'ℹ️';
    }
  };

  return (
    <div className={`toast-item type-${toast.type}`}>
      <div className="toast-content">
        <span className="toast-icon">{getIcon()}</span>
        <span>{toast.message}</span>
      </div>
      <button onClick={onClose} className="toast-close">×</button>
    </div>
  );
};
