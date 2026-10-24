import React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftAddon,
      rightAddon,
      id,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-foreground uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <div
          className={`flex items-center rounded-xl border bg-surface transition-all duration-150 px-3 py-2 text-sm shadow-xs ${
            error
              ? "border-expense ring-1 ring-expense/40"
              : "border-border hover:border-powder focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20"
          } ${disabled ? "opacity-60 bg-background pointer-events-none" : ""}`}
        >
          {leftAddon && (
            <div className="mr-2.5 flex items-center text-muted select-none">
              {leftAddon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`w-full bg-transparent text-foreground placeholder:text-muted/60 focus:outline-none disabled:cursor-not-allowed ${className}`.trim()}
            {...props}
          />
          {rightAddon && (
            <div className="ml-2.5 flex items-center text-muted select-none">
              {rightAddon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-expense font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
