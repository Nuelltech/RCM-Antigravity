"use client";

import * as React from "react";

export function Label({
    children,
    htmlFor,
    className = ""
}: {
    children: React.ReactNode;
    htmlFor?: string;
    className?: string;
}) {
    return (
        <label
            htmlFor={htmlFor}
            className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
        >
            {children}
        </label>
    );
}
