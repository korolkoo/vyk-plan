"use client";

import React, { useState, useEffect } from "react";
import { getAccountsAction } from "@/actions/contas";
import type { BankAccountWithBalance } from "@/types/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MoneyText } from "@/components/ui/MoneyText";
import { AccountModal } from "@/components/contas/AccountModal";
import { Landmark, PiggyBank, Wallet, TrendingUp, Plus, Edit3 } from "lucide-react";

export default function ContasPage() {
  const [accounts, setAccounts] = useState<BankAccountWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<BankAccountWithBalance | null>(null);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const data = await getAccountsAction();
      setAccounts(data);
    } catch (err) {
      console.error("Erro ao carregar contas:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const totalBalance = accounts.reduce(
    (acc, b) => acc + b.currentBalanceCents,
    0
  );

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "savings":
        return PiggyBank;
      case "wallet":
        return Wallet;
      case "investment":
        return TrendingUp;
      default:
        return Landmark;
    }
  };

  const handleOpenCreate = () => {
    setAccountToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (acc: BankAccountWithBalance) => {
    setAccountToEdit(acc);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Topo / Título e Ação */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl text-foreground font-bold tracking-tight">
            Minhas Contas
          </h1>
          <p className="text-sm text-muted mt-1">
            Gestão de contas correntes, investimentos, poupança e carteiras.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          variant="primary"
          className="self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Conta</span>
        </Button>
      </header>

      {/* Card de Patrimônio Total */}
      <Card variant="alice">
        <CardContent className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Saldo Total em Contas
          </p>
          <p className="text-3xl sm:text-4xl font-extrabold tabular text-navy dark:text-aurora mt-1">
            <MoneyText cents={totalBalance} />
          </p>
          <p className="text-xs text-muted mt-1">
            {accounts.length} conta(s) ativa(s) no Neon PostgreSQL
          </p>
        </CardContent>
      </Card>

      {/* Grid de Contas */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 rounded-card bg-surface/50 border border-border animate-pulse"
            />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card className="text-center py-12 px-4 border-dashed">
          <div className="w-12 h-12 rounded-full bg-accent/20 text-accent-foreground flex items-center justify-center mx-auto mb-3">
            <Landmark className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Nenhuma conta cadastrada ainda
          </h3>
          <p className="text-sm text-muted max-w-sm mx-auto mt-1 mb-5">
            Cadastre sua conta bancária (Nubank, Inter, Itaú...) ou carteira física para começar o controle.
          </p>
          <Button onClick={handleOpenCreate} variant="primary">
            <Plus className="w-4 h-4" />
            <span>Cadastrar Primeira Conta</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const Icon = getAccountIcon(account.type);

            return (
              <Card
                key={account.id}
                interactive
                onClick={() => handleOpenEdit(account)}
                className="group relative"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                        style={{ backgroundColor: account.color }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm group-hover:text-navy dark:group-hover:text-naples transition-colors">
                          {account.name}
                        </h3>
                        <p className="text-xs text-muted capitalize">
                          {account.type === "checking"
                            ? "Conta Corrente"
                            : account.type === "savings"
                            ? "Poupança"
                            : account.type === "wallet"
                            ? "Carteira"
                            : "Investimento"}
                        </p>
                      </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted hover:text-foreground">
                      <Edit3 className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40 flex items-baseline justify-between">
                    <span className="text-xs text-muted">Saldo Atual</span>
                    <span className="text-xl font-bold tabular text-foreground">
                      <MoneyText cents={account.currentBalanceCents} />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        accountToEdit={accountToEdit}
        onSuccess={loadAccounts}
      />
    </div>
  );
}
