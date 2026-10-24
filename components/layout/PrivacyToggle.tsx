"use client";

import React, { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { usePrivacyStore } from "@/store/usePrivacyStore";

export function PrivacyToggle({ className = "" }: { className?: string }) {
  const { isPrivate, togglePrivacy } = usePrivacyStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-full border border-border bg-surface/50 ${className}`.trim()}
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      onClick={togglePrivacy}
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full border border-border bg-surface text-foreground hover:bg-background hover:border-powder transition-all duration-200 focus-visible:outline-2 focus-visible:outline-ring active:scale-95 ${className}`.trim()}
      aria-label={isPrivate ? "Mostrar valores" : "Ocultar valores"}
      title={isPrivate ? "Mostrar valores" : "Ocultar valores (Modo Privacidade)"}
    >
      {isPrivate ? (
        <EyeOff className="w-4 h-4 text-accent-foreground dark:text-naples transition-transform" />
      ) : (
        <Eye className="w-4 h-4 text-muted transition-transform" />
      )}
    </button>
  );
}
