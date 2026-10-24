import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "neutral"
    | "forecast";
  size?: "sm" | "md";
}

export function Badge({
  variant = "neutral",
  size = "md",
  className = "",
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center font-medium rounded-full transition-colors whitespace-nowrap";

  const variantStyles = {
    // Verde / Pago / Receita
    success: "bg-income/10 text-income border border-income/20",
    // Vermelho / Despesa / Vencido
    danger: "bg-expense/10 text-expense border border-expense/20",
    // Amarelo / Pendente / Atenção
    warning: "bg-accent/20 text-navy dark:text-naples border border-accent/40",
    // Azul Powder / Detalhes / Aberto
    info: "bg-powder/20 text-navy dark:text-powder border border-powder/30",
    // Neutro / Secundário
    neutral: "bg-surface text-muted border border-border",
    // Previsto (recorrência não confirmada)
    forecast: "bg-foreground/5 text-muted border border-dashed border-border",
  }[variant];

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
  }[size];

  return (
    <span
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
}
