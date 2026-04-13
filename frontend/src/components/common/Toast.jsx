import { useEffect, useRef, useState } from 'react';
import { Trash2, ShieldCheck, AlertCircle, X } from 'lucide-react';

export default function Toast({
  isOpen,
  type = 'success',
  message,
  onClose,
  onConfirm,
  onCancel,
  autoClose = 5000
}) {
  const toastRef = useRef(null);
  
  // Animation states
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  // Handle mount/unmount animations
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      // Slight delay ensures the element is in the DOM before we trigger the CSS transition
      const frame = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setIsVisible(false);
      // Wait for the exit transition to finish (300ms) before removing from DOM
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle auto-close and click outside
  useEffect(() => {
    if (!isOpen) return;

    let timer;
    if (type !== 'confirm' && autoClose) {
      timer = setTimeout(onClose, autoClose);
    }

    const handleClickOutside = (event) => {
      if (toastRef.current && !toastRef.current.contains(event.target)) {
        if (type === 'confirm') onCancel();
        else onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, type, autoClose, onClose, onCancel]);

  if (!isRendered) return null;

  const isConfirm = type === 'confirm';
  const isError = type === 'error';

  const bgClass = isConfirm
    ? 'bg-amber-600 text-white border-amber-500/30 shadow-amber-500/15'
    : isError
      ? 'bg-red-600 text-white border-red-500/30 shadow-red-500/15'
      : 'bg-green-600 text-white border-green-500/30 shadow-green-500/15';

  const iconBgClass = isConfirm
    ? 'bg-white/15 text-white'
    : isError
      ? 'bg-red-700/15 text-white'
      : 'bg-white/15 text-white';

  return (
    <div className="fixed top-4 right-4 z-[200]">
      <div
        ref={toastRef}
        className={`
          relative flex items-start gap-3 min-w-[320px] max-w-[520px]
          rounded-xl border p-2 shadow-xl 
           transition-all duration-300 ease-in-out transform
          ${isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
          ${bgClass}
        `}
      >
        <div className={`flex h-8 w-8 items-center justify-center shrink-0 rounded-lg ${iconBgClass}`}>
          {isConfirm && <Trash2 className="w-5 h-5" />}
          {isError && <AlertCircle className="w-5 h-5" />}
          {!isConfirm && !isError && <ShieldCheck className="w-5 h-5" />}
        </div>

        <div className="flex-1 mt-1">
          <p className="text-sm font-semibold leading-6">
            {message}
          </p>
        </div>

        <button
          onClick={type === 'confirm' ? onCancel : onClose}
          className="absolute top-3 right-3 rounded-full p-1 text-white/80 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {isConfirm && (
          <div className="ml-2 mt-1 flex items-center">
            <button
              onClick={onConfirm}
              className="px-4 py-1.5 bg-white text-amber-700 text-xs font-semibold uppercase rounded-lg hover:bg-slate-100 transition"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}