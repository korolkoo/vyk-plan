import React from "react";

export interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 a 100
  color?: "accent" | "income" | "powder" | "navy";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  color = "accent",
  size = "md",
  showLabel = false,
  className = "",
  ...props
}: ProgressBarProps) {
  const clampedValue = Math.min(Math.max(Math.round(value), 0), 100);

  const sizeStyles = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  }[size];

  const colorStyles = {
    accent: "bg-accent",
    income: "bg-income",
    powder: "bg-powder",
    navy: "bg-navy dark:bg-powder",
  }[color];

  return (
    <div className={`w-full space-y-1.5 ${className}`.trim()} {...props}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs text-muted font-medium">
          <span>Progresso</span>
          <span className="tabular">{clampedValue}%</span>
        </div>
      )}
      <div
        className={`w-full bg-border/40 overflow-hidden rounded-full ${sizeStyles}`}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full transition-all duration-500 ease-out rounded-full ${colorStyles}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
