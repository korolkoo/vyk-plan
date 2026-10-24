import { headers } from "next/headers";
import { auth } from "./auth";

/**
 * Obtém a sessão do usuário atual no servidor a partir dos headers da requisição.
 * Retorna null se não houver usuário autenticado.
 */
export async function getCurrentSession() {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });
    return session;
  } catch {
    return null;
  }
}

/**
 * Garante que o usuário está autenticado no servidor.
 * Retorna os dados do usuário autenticado ou lança um erro caso não esteja logado.
 * Ideal para Server Actions onde o userId nunca deve ser fornecido pelo cliente.
 */
export async function requireUser() {
  const session = await getCurrentSession();

  if (!session?.user) {
    throw new Error("Acesso não autorizado. Faça login para continuar.");
  }

  return session.user;
}
