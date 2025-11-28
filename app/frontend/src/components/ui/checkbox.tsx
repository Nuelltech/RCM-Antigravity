"use client";

import * as React from "react";

const Checkbox = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
    return (
        <input
            type="checkbox"
            className={`h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 ${className || ""}`}
            ref={ref}
            {...props}
        />
    );
});
Checkbox.displayName = "Checkbox";

export { Checkbox };
