"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getCategoriesAction, deleteCategoryAction } from "@/actions/categorias";
import type { Category } from "@/types/types";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { CategoryModal } from "@/components/configuracoes/CategoryModal";
import { Palette, Tag, User, Plus, X } from "lucide-react";

export default function ConfiguracoesPage() {
  const { data: session } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const data = await getCategoriesAction();
      setCategories(data);
    } catch (err) {
      console.error("Erro ao carregar categorias:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleDeleteCategory = async (cat: Category) => {
    if (!confirm(`Deseja realmente excluir a categoria "${cat.name}"?`)) return;

    try {
      await deleteCategoryAction(cat.id);
      toast.success("Categoria removida com sucesso!");
      loadCategories();
    } catch {
      toast.error("Erro ao excluir categoria.");
    }
  };

  const userName = session?.user?.name || "Yuri";
  const userEmail = session?.user?.email || "yuri@vyk.local";

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
      <header>
        <h1 className="text-3xl text-foreground font-bold tracking-tight">
          Configurações
        </h1>
        <p className="text-sm text-muted mt-1">
          Perfil, categorias financeiras e preferências do sistema.
        </p>
      </header>

      {/* Perfil do Usuário Autenticado */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-navy dark:text-naples" />
            <CardTitle>Perfil do Usuário</CardTitle>
          </div>
          <CardDescription>
            Conta autenticada no Neon PostgreSQL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-navy text-aurora dark:bg-naples dark:text-navy flex items-center justify-center font-bold text-xl shadow-xs">
              {userName.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-foreground text-base">
                {userName}
              </p>
              <p className="text-sm text-muted">{userEmail}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="info" size="sm">
                  Ambiente Individual Ativo
                </Badge>
                <Badge variant="neutral" size="sm">
                  Neon Serverless
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aparência & Tema */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-navy dark:text-naples" />
            <CardTitle>Aparência</CardTitle>
          </div>
          <CardDescription>
            Alterne entre o tema Claro (Aurora) e Escuro (Navy Deep)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Modo Escuro / Claro
              </p>
              <p className="text-xs text-muted">
                Personalize a interface para uso diurno ou noturno.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* Categorias Cadastradas com Criação e Exclusão */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-navy dark:text-naples" />
                <CardTitle>Categorias do Sistema & Personalizadas</CardTitle>
              </div>
              <CardDescription>
                Categorias globais e exclusivas criadas por você
              </CardDescription>
            </div>

            <Button
              onClick={() => setIsCategoryModalOpen(true)}
              variant="primary"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Categoria</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-8 w-24 rounded-xl bg-surface/50 border border-border animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const isCustom = c.userId !== null;

                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-medium group transition-colors"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span>{c.name}</span>
                    {c.systemKey === "wedding" && (
                      <span className="text-[10px] text-accent-foreground bg-accent px-1.5 py-0.2 rounded-md font-bold">
                        Casamento
                      </span>
                    )}

                    {isCustom && (
                      <button
                        onClick={() => handleDeleteCategory(c)}
                        className="ml-1 text-muted hover:text-expense opacity-60 group-hover:opacity-100 transition-opacity"
                        title="Excluir categoria"
                        aria-label={`Excluir categoria ${c.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação de Categoria */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={loadCategories}
      />
    </div>
  );
}
