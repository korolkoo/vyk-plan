import React from "react";
import Link from "next/link";

export interface LogoProps {
  size?: "sm" | "md" | "lg";
  withLink?: boolean;
  className?: string;
}

export function Logo({
  size = "md",
  withLink = true,
  className = "",
}: LogoProps) {
  const sizeStyles = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-5xl",
  }[size];

  const content = (
    <span
      className={`font-display font-extrabold lowercase tracking-tight select-none text-navy dark:text-aurora transition-colors duration-200 ${sizeStyles} ${className}`.trim()}
    >
      vyk
    </span>
  );

  if (withLink) {
    return (
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-ring rounded-lg group"
        aria-label="vyk - Ir para o início"
      >
        {content}
      </Link>
    );
  }

  return content;
}
