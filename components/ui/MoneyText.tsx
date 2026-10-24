"use client";

import React, { useEffect, useState } from "react";
import { formatCurrency } from "@/utils/format";
import { usePrivacyStore } from "@/store/usePrivacyStore";

export interface MoneyTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  cents: number;
  prefix?: string;
  mask?: string;
}

export function MoneyText({
  cents,
  prefix,
  mask = "••••••",
  className = "",
  ...props
}: MoneyTextProps) {
  const { isPrivate } = usePrivacyStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatted = formatCurrency(cents);

  // Antes de montar no cliente, exibe o valor formatado para evitar hydration mismatch
  if (!mounted) {
    return (
      <span className={`tabular ${className}`.trim()} {...props}>
        {prefix}
        {formatted}
      </span>
    );
  }

  if (isPrivate) {
    return (
      <span
        className={`tabular select-none tracking-widest text-muted/70 font-mono ${className}`.trim()}
        title="Valor ocultado (Modo Privacidade)"
        {...props}
      >
        {mask}
      </span>
    );
  }

  return (
    <span className={`tabular ${className}`.trim()} {...props}>
      {prefix}
      {formatted}
    </span>
  );
}
