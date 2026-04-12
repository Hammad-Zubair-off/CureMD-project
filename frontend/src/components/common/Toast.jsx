import { useEffect, useRef } from 'react';
import {
    Trash2,
    ShieldCheck,
    AlertCircle
} from 'lucide-react';

export default function Toast({
    isOpen,
    type = 'success', // 'success', 'error', 'confirm'
    message,
    onClose,
    onConfirm,
    onCancel,
    autoClose = 5000
}) {
    const toastRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        // Auto-close for non-confirm types
        let timer;
        if (type !== 'confirm' && autoClose) {
            timer = setTimeout(onClose, autoClose);
        }

        // Outside click listener
        const handleClickOutside = (event) => {
            if (toastRef.current && !toastRef.current.contains(event.target)) {
                if (type === 'confirm') {
                    onCancel();
                } else {
                    onClose();
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            if (timer) clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, type, autoClose, onClose, onCancel]);

    if (!isOpen) return null;

    const isConfirm = type === 'confirm';
    const isError = type === 'error';

    return (
        <div className="fixed bottom-10 right-10 z-[200] animate-in slide-in-from-right-full duration-700 ease-out">
            <div
                ref={toastRef}
                className={`
                    relative flex items-center p-4 rounded-[2.5rem] shadow-2xl border transition-all min-w-[380px] max-w-[620px]
                    ${isConfirm
                        ? 'bg-red-600 text-white border-red-500 ring-4 ring-red-500/10'
                        : `bg-white text-slate-900 ${isError ? 'border-red-100' : 'border-blue-100'} shadow-2xl shadow-slate-200/50`}
                `}
            >
                {/* Icon Section */}
                <div className={`
                    p-2 rounded-full shrink-0 mr-6
                    ${isConfirm ? 'bg-white/20' : (isError ? 'bg-red-50' : 'bg-blue-50')}
                `}>
                    {isConfirm && <Trash2 className="w-6 h-6 text-white" />}
                    {isError && <AlertCircle className="w-6 h-6 text-red-500" />}
                    {type === 'success' && <ShieldCheck className="w-6 h-6 text-blue-600" />}
                </div>

                {/* Content Section */}
                <div className="flex-1">
                    <p className={`text-[15px] font-bold leading-relaxed ${isConfirm ? 'text-white' : 'text-slate-800'}`}>
                        {message}
                    </p>
                </div>

                {/* Actions Section */}
                {isConfirm && (
                    <div className="ml-8">
                        <button
                            onClick={onConfirm}
                            className="px-8 py-3.5 bg-white text-red-600 text-xs font-black uppercase tracking-widest rounded-full transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/10 flex items-center space-x-2"
                        >
                            <span>Remove</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
