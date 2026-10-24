"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { signIn } from "@/lib/auth-client";
import { Logo } from "@/components/layout/Logo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Lock, Mail, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Informe seu e-mail e senha.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        toast.error(
          result.error.message || "Credenciais inválidas. Verifique seu e-mail e senha."
        );
        setIsLoading(false);
        return;
      }

      toast.success("Login realizado com sucesso!");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Erro ao conectar com o servidor. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground p-6 sm:p-8">
      {/* Topo com alternador de tema */}
      <header className="flex justify-end max-w-md w-full mx-auto">
        <ThemeToggle />
      </header>

      {/* Caixa Central de Login */}
      <main className="w-full max-w-sm mx-auto space-y-8 my-auto animate-in fade-in duration-300">
        <div className="text-center space-y-2">
          <Logo size="lg" withLink={false} />
          <h1 className="text-2xl font-bold font-display text-foreground tracking-tight mt-1">
            Entrar no VYK Plan
          </h1>
          <p className="text-xs text-muted">
            Planejamento financeiro, casamento & empresa.
          </p>
        </div>

        <Card className="shadow-lg border-border/80">
          <CardContent className="p-6 sm:p-7 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="E-mail"
                type="email"
                placeholder="seu-email@vyk.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftAddon={<Mail className="w-4 h-4 text-muted" />}
                required
                autoComplete="email"
                autoFocus
              />

              <Input
                label="Senha"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftAddon={<Lock className="w-4 h-4 text-muted" />}
                required
                autoComplete="current-password"
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full text-base font-semibold"
                  isLoading={isLoading}
                >
                  Entrar no App
                </Button>
              </div>
            </form>

            <div className="flex items-center gap-2 justify-center pt-2 text-[11px] text-muted border-t border-border/50">
              <ShieldCheck className="w-3.5 h-3.5 text-navy dark:text-naples" />
              <span>Acesso restrito exclusivo para Yuri & Vithória</span>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Rodapé minimalista */}
      <footer className="text-center text-xs text-muted/70 py-4">
        vyk plan · 2026
      </footer>
    </div>
  );
}
