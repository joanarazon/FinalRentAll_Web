import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export function DialogOverlay(props) {
    return (
        <DialogPrimitive.Overlay
            {...props}
            className={
                "fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out"
            }
        />
    );
}

export function DialogContent({ className = "", children, ...props }) {
    return (
        <DialogPrimitive.Portal>
            <DialogOverlay />
            <DialogPrimitive.Content
                {...props}
                className={
                    "fixed z-50 left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-4 shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 border " +
                    className
                }
            >
                {children}
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    );
}

export function DialogHeader({ className = "", children }) {
    return <div className={"mb-2 " + className}>{children}</div>;
}

export function DialogTitle({ className = "", children }) {
    return (
        <DialogPrimitive.Title className={"text-lg font-semibold " + className}>
            {children}
        </DialogPrimitive.Title>
    );
}

export function DialogDescription({ className = "", children }) {
    return (
        <DialogPrimitive.Description
            className={"text-sm text-gray-600 " + className}
        >
            {children}
        </DialogPrimitive.Description>
    );
}

export function DialogFooter({ className = "", children }) {
    return (
        <div className={"mt-4 flex justify-end gap-2 " + className}>
            {children}
        </div>
    );
}
