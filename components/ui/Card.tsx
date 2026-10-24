import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * - default: fundo de superfície limpo (branco no light, navy-deep suave no dark)
   * - alice: destaque acolhedor com Alice Yellow (no dark: azul marinho acentuado)
   * - flat: sem elevação ou sombra, apenas contorno sutil
   */
  variant?: "default" | "alice" | "flat";
  interactive?: boolean;
}

export function Card({
  variant = "default",
  interactive = false,
  className = "",
  children,
  ...props
}: CardProps) {
  const baseStyles =
    "rounded-card transition duration-200 border border-border";

  const variantStyles = {
    default: "bg-surface text-foreground shadow-xs",
    alice: "bg-card text-card-foreground shadow-xs",
    flat: "bg-transparent text-foreground",
  }[variant];

  const interactiveStyles = interactive
    ? "cursor-pointer hover:border-powder hover:shadow-md active:scale-[0.99]"
    : "";

  return (
    <div
      className={`${baseStyles} ${variantStyles} ${interactiveStyles} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-5 sm:p-6 pb-2 sm:pb-3 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-lg font-semibold tracking-tight text-foreground ${className}`.trim()}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-sm text-muted mt-0.5 ${className}`.trim()} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-5 sm:p-6 pt-2 sm:pt-3 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`p-5 sm:p-6 pt-0 flex items-center border-t border-border/40 mt-3 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
