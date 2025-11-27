import React from "react";

export default function Loading() {
    return (
        <div className="w-full h-[40vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
        </div>
    );
}
