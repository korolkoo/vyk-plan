"use client";

import React from "react";
import { Plus } from "lucide-react";

export interface FabProps {
  onClick: () => void;
  label?: string;
}

export function Fab({ onClick, label = "Novo lançamento" }: FabProps) {
  return (
    <button
      onClick={onClick}
      className="hidden lg:inline-flex fixed bottom-8 right-8 z-40 items-center gap-2.5 px-5 py-3.5 rounded-full bg-accent text-accent-foreground font-semibold shadow-lg hover:shadow-xl hover:brightness-95 active:scale-95 transition-all duration-200 border border-accent/20 select-none group"
      aria-label={label}
      title={label}
    >
      <Plus className="w-5 h-5 stroke-[2.5] transition-transform group-hover:rotate-90 duration-200" />
      <span className="text-sm">{label}</span>
    </button>
  );
}
