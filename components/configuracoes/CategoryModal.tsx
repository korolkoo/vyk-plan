"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createCategoryAction } from "@/actions/categorias";
import type { CategoryKind } from "@/types/types";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORY_COLORS = [
  "#2F9E6F", // Verde
  "#4FB38A", // Verde Claro
  "#E8A33D", // Laranja
  "#5B7593", // Azul Slate
  "#6C8EBF", // Azul Suave
  "#C76BA8", // Rosa / Púrpura
  "#D9534F", // Vermelho
  "#8A6FD1", // Roxo
  "#FEDE6F", // Amarelo Naples
  "#A3C5EB", // Azul Powder
];

export function CategoryModal({
  isOpen,
  onClose,
  onSuccess,
}: CategoryModalProps) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome da categoria");
      return;
    }

    setIsLoading(true);

    try {
      await createCategoryAction({
        name,
        kind,
        color,
      });

      toast.success("Categoria criada com sucesso!");
      setName("");
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar categoria.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Categoria"
      description="Crie uma categoria personalizada para organizar seus gastos ou receitas."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo: Despesa ou Receita */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-background rounded-full border border-border">
          <button
            type="button"
            onClick={() => setKind("expense")}
            className={`py-1.5 text-xs font-semibold rounded-full transition-all ${
              kind === "expense"
                ? "bg-expense/15 text-expense border border-expense/30 shadow-2xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            Despesa
          </button>
          <button
            type="button"
            onClick={() => setKind("income")}
            className={`py-1.5 text-xs font-semibold rounded-full transition-all ${
              kind === "income"
                ? "bg-income/15 text-income border border-income/30 shadow-2xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            Receita
          </button>
        </div>

        {/* Nome */}
        <Input
          label="Nome da Categoria"
          placeholder="Ex: Cursos, Streaming, Pets, Farmácia..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        {/* Cores */}
        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
            Cor da Tag
          </label>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-transform border-2 ${
                  color === c ? "scale-110 border-foreground shadow-xs" : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Selecionar cor ${c}`}
              />
            ))}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Criar Categoria
          </Button>
        </div>
      </form>
    </Modal>
  );
}
