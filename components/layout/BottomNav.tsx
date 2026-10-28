"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  CreditCard,
  Gem,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  Rocket,
  Settings,
  Target,
  X,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { PrivacyToggle } from "./PrivacyToggle";
import { useSession, signOut } from "@/lib/auth-client";

interface BottomNavProps {
  onQuickAdd?: () => void;
}

export function BottomNav({ onQuickAdd }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const userName = session?.user?.name || "Carregando...";
  const userEmail = session?.user?.email || "";
  const initial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "•";

  const isActive = (href: string) => {
    if (href === "/") return pathname === "";
    return pathname.startsWith(href);
  };

  const moreItems = [
    { name: "Casamento", href: "/casamento", icon: Gem },
    { name: "Empresa VYK", href: "/empresa", icon: Rocket },
    { name: "Contas", href: "/contas", icon: Landmark },
    { name: "Cartões", href: "/cartoes", icon: CreditCard },
    { name: "Metas", href: "/metas", icon: Target },
    { name: "Configurações", href: "/configuracoes", icon: Settings },
  ];

  return (
    <>
      {/* Barra de Navegação Inferior (Mobile Only) */}
      <nav
        aria-label="Navegação móvel"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border shadow-lg pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-2">
          {/* Início */}
          <Link
            href="/"
            className={`flex flex-col items-center justify-center gap-1 h-full py-1 text-xs transition-colors ${
              isActive("/") && !isMoreOpen
                ? "text-navy dark:text-naples font-semibold"
                : "text-muted hover:text-foreground"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px]">Início</span>
          </Link>

          {/* Finanças */}
          <Link
            href="/financas"
            className={`flex flex-col items-center justify-center gap-1 h-full py-1 text-xs transition-colors ${
              isActive("/financas") && !isMoreOpen
                ? "text-navy dark:text-naples font-semibold"
                : "text-muted hover:text-foreground"
            }`}
          >
            <ReceiptText className="w-5 h-5" />
            <span className="text-[10px]">Finanças</span>
          </Link>

          {/* Botão Central [+] Lançamento Rápido */}
          <div className="flex items-center justify-center -mt-5">
            <button
              onClick={onQuickAdd}
              className="w-12 h-12 rounded-full bg-accent text-accent-foreground shadow-md hover:brightness-95 active:scale-95 flex items-center justify-center transition-transform border-2 border-surface"
              aria-label="Novo lançamento"
              title="Novo lançamento"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {/* Calendário (Acesso Rápido) */}
          <Link
            href="/calendario"
            className={`flex flex-col items-center justify-center gap-1 h-full py-1 text-xs transition-colors ${
              isActive("/calendario") && !isMoreOpen
                ? "text-navy dark:text-naples font-semibold"
                : "text-muted hover:text-foreground"
            }`}
          >
            <CalendarDays className="w-5 h-5" />
            <span className="text-[10px]">Calendário</span>
          </Link>

          {/* Mais (Gaveta com Casamento, Contas, Cartões, Metas) */}
          <button
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-1 h-full py-1 text-xs transition-colors ${
              isMoreOpen
                ? "text-navy dark:text-naples font-semibold"
                : "text-muted hover:text-foreground"
            }`}
            aria-label="Abrir mais opções"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px]">Mais</span>
          </button>
        </div>
      </nav>

      {/* Gaveta / Menu "Mais" (Mobile Bottom Sheet) */}
      {isMoreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-navy-deep/60 backdrop-blur-xs animate-in fade-in"
            onClick={() => setIsMoreOpen(false)}
            aria-hidden="true"
          />

          {/* Painel da gaveta */}
          <div className="relative w-full bg-surface text-foreground rounded-t-card border-t border-border shadow-2xl p-6 z-10 animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto">
            {/* Cabeçalho da Gaveta */}
            <div className="flex items-center justify-between pb-4 border-b border-border/40 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-navy text-aurora dark:bg-naples dark:text-navy flex items-center justify-center font-bold text-sm shrink-0">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{userName}</p>
                  <p className="text-xs text-muted truncate">{userEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <PrivacyToggle />
                <ThemeToggle />
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full text-muted hover:text-danger hover:bg-danger/10"
                  aria-label="Sair da conta"
                  title="Sair da conta"
                >
                  <LogOut className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="p-2 rounded-full text-muted hover:text-foreground hover:bg-background"
                  aria-label="Fechar menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Links da gaveta */}
            <div className="grid grid-cols-2 gap-2.5">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMoreOpen(false)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm font-medium transition-colors ${
                      active
                        ? "bg-foreground/5 border-powder/50 text-foreground font-semibold"
                        : "bg-background/50 border-border/60 text-foreground hover:bg-background"
                    }`}
                  >
                    <Icon className="w-4 h-4 text-navy dark:text-naples" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
