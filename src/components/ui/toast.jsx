import React, {
    createContext,
    useCallback,
    useContext,
    useState,
    useEffect,
} from "react";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children, duration = 4000, max = 5 }) {
    const [toasts, setToasts] = useState([]);

    const remove = useCallback((id) => {
        setToasts((t) => t.filter((toast) => toast.id !== id));
    }, []);

    const push = useCallback(
        (toast) => {
            setToasts((t) => {
                const next = [...t, { id: ++idCounter, ...toast }];
                if (next.length > max) next.shift();
                return next;
            });
        },
        [max]
    );

    useEffect(() => {
        if (!toasts.length) return;
        const timers = toasts.map((toast) =>
            setTimeout(() => remove(toast.id), toast.duration || duration)
        );
        return () => timers.forEach(clearTimeout);
    }, [toasts, duration, remove]);

    return (
        <ToastContext.Provider value={{ push, remove }}>
            {children}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`border shadow-sm rounded-md px-4 py-3 text-sm flex items-start gap-3 bg-white ${
                            t.type === "error"
                                ? "border-red-400"
                                : t.type === "success"
                                ? "border-green-400"
                                : "border-gray-300"
                        }`}
                    >
                        <div className="flex-1">
                            {t.title && (
                                <p className="font-medium mb-0 leading-snug">
                                    {t.title}
                                </p>
                            )}
                            {t.message && (
                                <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                                    {t.message}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => remove(t.id)}
                            className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}

export function useToastApi() {
    const { push } = useToast();
    const success = useCallback(
        (message, opts = {}) => push({ type: "success", message, ...opts }),
        [push]
    );
    const error = useCallback(
        (message, opts = {}) => push({ type: "error", message, ...opts }),
        [push]
    );
    const info = useCallback(
        (message, opts = {}) => push({ type: "info", message, ...opts }),
        [push]
    );
    return React.useMemo(
        () => ({ success, error, info }),
        [success, error, info]
    );
}
