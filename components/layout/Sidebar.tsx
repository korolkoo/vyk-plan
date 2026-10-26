"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  CreditCard,
  Gem,
  Landmark,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Rocket,
  Settings,
  Target,
} from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { PrivacyToggle } from "./PrivacyToggle";
import { useSession, signOut } from "@/lib/auth-client";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  isSpecial?: boolean;
}

const individualNav: NavItem[] = [
  { name: "Início", href: "/", icon: LayoutDashboard },
  { name: "Finanças", href: "/financas", icon: ReceiptText },
  { name: "Contas", href: "/contas", icon: Landmark },
  { name: "Cartões", href: "/cartoes", icon: CreditCard },
  { name: "Calendário", href: "/calendario", icon: CalendarDays },
  { name: "Metas", href: "/metas", icon: Target },
];

const sharedNav: NavItem[] = [
  {
    name: "Casamento",
    href: "/casamento",
    icon: Gem,
    isSpecial: true,
  },
  {
    name: "Empresa VYK",
    href: "/empresa",
    icon: Rocket,
    isSpecial: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const { data: session } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const userName = session?.user?.name || "Carregando...";
  const userEmail = session?.user?.email || "";
  const initial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "•";

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 min-h-screen bg-surface border-r border-border select-none">
      {/* Topo / Logo */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-border/40">
        <Logo size="md" />
        <div className="flex items-center gap-2">
          <PrivacyToggle />
          <ThemeToggle />
        </div>
      </div>

      {/* Conteúdo rolável da navegação */}
      <div className="flex-1 flex flex-col justify-between p-4 overflow-y-auto">
        <div className="space-y-6">
          {/* Navegação Individual */}
          <div>
            <p className="px-3 text-[11px] font-bold text-muted uppercase tracking-wider mb-2">
              Individual
            </p>
            <nav className="space-y-1">
              {individualNav.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      active
                        ? "bg-foreground/5 text-foreground font-semibold shadow-2xs border border-border/60"
                        : "text-muted hover:text-foreground hover:bg-foreground/[0.02]"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        active ? "text-navy dark:text-naples" : "text-muted"
                      }`}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Navegação Compartilhada — Casamento */}
          <div>
            <p className="px-3 text-[11px] font-bold text-muted uppercase tracking-wider mb-2">
              Compartilhado
            </p>
            <nav className="space-y-1">
              {sharedNav.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      active
                        ? "bg-accent/20 text-navy dark:text-naples font-semibold border border-accent/40"
                        : "text-muted hover:text-foreground hover:bg-accent/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 ${
                          active
                            ? "text-navy dark:text-naples"
                            : "text-accent-foreground"
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                      2 noivos
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Rodapé: Configurações + Perfil */}
        <div className="pt-4 border-t border-border/60 space-y-2">
          <Link
            href="/configuracoes"
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              isActive("/configuracoes")
                ? "bg-foreground/5 text-foreground font-semibold"
                : "text-muted hover:text-foreground hover:bg-foreground/[0.02]"
            }`}
          >
            <Settings className="w-4 h-4 text-muted" />
            <span>Configurações</span>
          </Link>

          {/* Card do Usuário com Logout */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-background/50 border border-border/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-navy text-aurora dark:bg-naples dark:text-navy flex items-center justify-center font-bold text-xs shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {userName}
                </p>
                <p className="text-[11px] text-muted truncate">
                  {userEmail}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
              title="Sair da conta"
              aria-label="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
