"use client"

import { useToast } from "@/hooks/use-toast"
import { X } from "lucide-react"

export function Toaster() {
    const { toasts, dismiss } = useToast()

    return (
        <div className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
            {toasts.map(function ({ id, title, description, action, ...props }) {
                return (
                    <div
                        key={id}
                        className={`
              group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all 
              ${props.variant === "destructive"
                                ? "border-red-500/50 bg-red-50 text-red-900"
                                : "border-gray-200 bg-white text-gray-900"}
              data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full
            `}
                        data-state={props.open !== false ? "open" : "closed"}
                    >
                        <div className="grid gap-1">
                            {title && (
                                <div className="text-sm font-semibold">
                                    {title}
                                </div>
                            )}
                            {description && (
                                <div className="text-sm opacity-90">
                                    {description}
                                </div>
                            )}
                        </div>
                        {action}
                        <button
                            onClick={() => dismiss(id)}
                            className="absolute right-2 top-2 rounded-md p-1 text-gray-400 hover:text-gray-900 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
