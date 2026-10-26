"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  createWeddingItemAction,
  updateWeddingItemAction,
  deleteWeddingItemAction,
  type WeddingItemWithInstallments,
} from "@/actions/casamento";
import { Gem, Trash2 } from "lucide-react";

interface WeddingItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: WeddingItemWithInstallments | null;
  onSuccess?: () => void;
}

export function WeddingItemModal({
  isOpen,
  onClose,
  itemToEdit,
  onSuccess,
}: WeddingItemModalProps) {
  const isEditing = !!itemToEdit;

  const [name, setName] = useState("");
  const [supplier, setSupplier] = useState("");
  const [contact, setContact] = useState("");
  const [totalAmountInput, setTotalAmountInput] = useState("");
  const [status, setStatus] = useState<"quoting" | "closed" | "paid">("closed");
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [firstDueDate, setFirstDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name);
      setSupplier(itemToEdit.supplier || "");
      setContact(itemToEdit.contact || "");
      setTotalAmountInput(
        (itemToEdit.totalCents / 100).toFixed(2).replace(".", ",")
      );
      setStatus(itemToEdit.status);
      setNotes(itemToEdit.notes || "");
      setInstallmentsCount(itemToEdit.installments?.length || 1);
      setFirstDueDate("");
    } else {
      setName("");
      setSupplier("");
      setContact("");
      setTotalAmountInput("");
      setStatus("closed");
      setInstallmentsCount(1);
      setFirstDueDate(new Date().toISOString().split("T")[0]);
      setNotes("");
    }
  }, [itemToEdit, isOpen]);

  const parseCurrencyInput = (value: string): number => {
    const cleaned = value.replace(/\D/g, "");
    return parseInt(cleaned, 10) || 0;
  };

  const handleCurrencyChange = (value: string) => {
    const numeric = value.replace(/\D/g, "");
    if (!numeric) {
      setTotalAmountInput("");
      return;
    }
    const cents = parseInt(numeric, 10);
    setTotalAmountInput((cents / 100).toFixed(2).replace(".", ","));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Informe o nome do item/serviço");
      return;
    }

    const totalCents = parseCurrencyInput(totalAmountInput);
    if (totalCents <= 0) {
      toast.error("Informe o valor total");
      return;
    }

    setIsLoading(true);

    try {
      if (isEditing && itemToEdit) {
        const res = await updateWeddingItemAction(itemToEdit.id, {
          name: name.trim(),
          supplier: supplier.trim() || null,
          contact: contact.trim() || null,
          totalCents,
          status,
          notes: notes.trim() || null,
        });

        if (!res.success) {
          toast.error(res.error || "Erro ao atualizar item");
          setIsLoading(false);
          return;
        }

        toast.success("Item atualizado!");
      } else {
        const res = await createWeddingItemAction({
          name: name.trim(),
          supplier: supplier.trim() || null,
          contact: contact.trim() || null,
          totalCents,
          status,
          notes: notes.trim() || null,
          installmentsCount: installmentsCount > 1 ? installmentsCount : 1,
          firstDueDate: firstDueDate || new Date().toISOString().split("T")[0],
        });

        if (!res.success) {
          toast.error(res.error || "Erro ao criar item");
          setIsLoading(false);
          return;
        }

        toast.success("Item do casamento adicionado!");
      }

      onSuccess?.();
      onClose();
    } catch {
      toast.error("Erro ao salvar item");
    } finally {
      setIsLoading(false);
    }
  };

  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const handleConfirmDelete = async () => {
    if (!itemToEdit) return;

    setIsDeleting(true);
    try {
      const res = await deleteWeddingItemAction(itemToEdit.id);
      if (res.success) {
        toast.success("Item excluído com sucesso");
        setIsConfirmDeleteOpen(false);
        onSuccess?.();
        onClose();
      } else {
        toast.error(res.error || "Erro ao excluir");
      }
    } catch {
      toast.error("Erro ao excluir item");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Contrato / Item" : "Novo Contrato ou Serviço"}
      description="Gerencie os custos e fornecedores do grande dia."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Nome do Serviço ou Item
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Espaço & Buffet, Fotógrafo, Banda, Decoração"
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Fornecedor / Empresa
            </label>
            <Input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Ex.: Buffet Imperial"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Contato (WhatsApp/Tel)
            </label>
            <Input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Ex.: (11) 98765-4321"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Valor Total (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                R$
              </span>
              <Input
                type="text"
                value={totalAmountInput}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                placeholder="0,00"
                className="pl-9 font-semibold tabular"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Status do Contrato
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
            >
              <option value="quoting">Orçando (Em negociação)</option>
              <option value="closed">Fechado (Contratado)</option>
              <option value="paid">Quitado (100% Pago)</option>
            </select>
          </div>
        </div>

        {/* Parcelamento para novo item fechado */}
        {!isEditing && status !== "paid" && (
          <div className="p-3.5 rounded-xl bg-surface border border-border space-y-3">
            <span className="text-xs font-semibold text-foreground block">
              Condições de Pagamento / Parcelamento
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-muted mb-1">
                  Parcelar em
                </label>
                <select
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg bg-background border border-border text-foreground text-xs"
                >
                  <option value={1}>1x (À vista / Parcela única)</option>
                  {[2, 3, 4, 5, 6, 8, 10, 12, 18, 24].map((num) => (
                    <option key={num} value={num}>
                      {num}x parcelas mensais
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-muted mb-1">
                  1º Vencimento
                </label>
                <Input
                  type="date"
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Observações / Detalhes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: Inclui decoração floral, bar de caipirinhas, etc."
            rows={2}
            className="w-full p-3 rounded-xl bg-surface border border-border text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
          {isEditing ? (
            <button
              type="button"
              onClick={() => setIsConfirmDeleteOpen(true)}
              disabled={isDeleting || isLoading}
              className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading || isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              disabled={isDeleting}
            >
              {isEditing ? "Salvar Alterações" : "Adicionar Item"}
            </Button>
          </div>
        </div>
      </form>

      {/* Modal In-App de Confirmação de Exclusão */}
      {isConfirmDeleteOpen && itemToEdit && (
        <ConfirmModal
          isOpen={isConfirmDeleteOpen}
          onClose={() => setIsConfirmDeleteOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Excluir Item do Casamento"
          description={`Tem certeza que deseja excluir o item "${itemToEdit.name}" e todas as suas parcelas associadas? Esta ação não pode ser desfeita.`}
          confirmText="Excluir Item"
          cancelText="Cancelar"
          variant="danger"
        />
      )}
    </Modal>
  );
}
