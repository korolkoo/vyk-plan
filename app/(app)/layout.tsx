"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Fab } from "@/components/layout/Fab";
import { QuickTransactionModal } from "@/components/financas/QuickTransactionModal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar Desktop */}
      <React.Suspense fallback={<aside className="hidden lg:block w-64 bg-surface" />}>
        <Sidebar />
      </React.Suspense>

      {/* Área Principal de Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 pb-28 lg:pb-12 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Botão Flutuante Desktop */}
      <Fab onClick={() => setIsQuickAddOpen(true)} />

      {/* Navegação Inferior Mobile */}
      <React.Suspense fallback={null}>
        <BottomNav onQuickAdd={() => setIsQuickAddOpen(true)} />
      </React.Suspense>

      {/* Modal Global de Novo Lançamento */}
      <QuickTransactionModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />
    </div>
  );
}
