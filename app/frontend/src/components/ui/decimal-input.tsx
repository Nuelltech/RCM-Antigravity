import * as React from "react"
import { Input, InputProps } from "@/components/ui/input"

const DecimalInput = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, onChange, onBlur, value, defaultValue, ...props }, ref) => {
        const [localValue, setLocalValue] = React.useState<string>(
            value !== undefined ? String(value) : defaultValue !== undefined ? String(defaultValue) : ""
        )

        // Sync external value when it changes, but do not overwrite trailing dots
        React.useEffect(() => {
            if (value !== undefined) {
                const strValue = String(value);
                // Only update local value if it represents a different number
                // e.g. local="1.", external=1 -> keep "1."
                const localNum = parseFloat(localValue.replace(/,/g, '.'));
                const extNum = parseFloat(strValue);

                if (localValue === "" && (value === "" || value === null)) {
                    // Do nothing
                } else if (!isNaN(localNum) && !isNaN(extNum) && localNum === extNum && (localValue.endsWith('.') || localValue.endsWith(','))) {
                    // Do nothing, let user finish typing
                } else {
                    setLocalValue(strValue);
                }
            }
        }, [value]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            let val = e.target.value;

            // Replace commas with dots
            val = val.replace(/,/g, '.');

            // Set the sanitized string to local state so the input UI doesn't drop the dot
            let sanitized = val.replace(/[^\d.-]/g, '');

            // Allow only one decimal point
            const parts = sanitized.split('.');
            if (parts.length > 2) {
                sanitized = parts[0] + '.' + parts.slice(1).join('');
            }

            setLocalValue(sanitized);

            // Also update e.target.value for react-hook-form to read
            e.target.value = sanitized;

            if (onChange) {
                // Important: react-hook-form will read e.target.value and parse it if valueAsNumber is used.
                // If it's controlled (like in the edit page), it will receive the event with the sanitized string.
                onChange(e);
            }
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            // Clean up trailing dots when leaving the input
            if (localValue.endsWith('.') || localValue.endsWith(',')) {
                const cleaned = localValue.slice(0, -1);
                setLocalValue(cleaned);
                e.target.value = cleaned;
                if (onChange) {
                    onChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
                }
            }
            // Add a leading zero if starts with dot
            if (localValue.startsWith('.')) {
                const cleaned = '0' + localValue;
                setLocalValue(cleaned);
                e.target.value = cleaned;
                if (onChange) {
                    onChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
                }
            }
            if (onBlur) {
                onBlur(e);
            }
        };

        return (
            <Input
                className={className}
                ref={ref}
                onChange={handleChange}
                onBlur={handleBlur}
                value={value !== undefined ? localValue : undefined}
                defaultValue={value === undefined ? defaultValue : undefined}
                {...props}
                type="text"
                inputMode="decimal"
            />
        )
    }
)
DecimalInput.displayName = "DecimalInput"

export { DecimalInput }
