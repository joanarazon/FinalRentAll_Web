import React, { createContext, useCallback, useContext } from "react";
import Swal from "sweetalert2";

// Keep a minimal context API so existing imports don’t break, but delegate to SweetAlert2
const ToastContext = createContext({
    success: (msg, opts) => {},
    error: (msg, opts) => {},
    info: (msg, opts) => {},
});

export function ToastProvider({ children }) {
    const success = useCallback((message, opts = {}) => {
        Swal.fire({
            icon: "success",
            title: opts.title || "Success",
            text: message,
            timer: opts.duration ?? 2500,
            showConfirmButton: false,
            timerProgressBar: true,
            ...opts,
        });
    }, []);

    const error = useCallback((message, opts = {}) => {
        Swal.fire({
            icon: "error",
            title: opts.title || "Error",
            text: message,
            timer: opts.sticky ? undefined : opts.duration ?? 3000,
            showConfirmButton: !opts.sticky,
            ...opts,
        });
    }, []);

    const info = useCallback((message, opts = {}) => {
        Swal.fire({
            icon: "info",
            title: opts.title || "Info",
            text: message,
            timer: opts.duration ?? 2500,
            showConfirmButton: false,
            timerProgressBar: true,
            ...opts,
        });
    }, []);

    const value = React.useMemo(
        () => ({ success, error, info }),
        [success, error, info]
    );
    return (
        <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}

export function useToastApi() {
    // Keep the same hook API used throughout the app
    const { success, error, info } = useToast();
    return React.useMemo(
        () => ({ success, error, info }),
        [success, error, info]
    );
}
