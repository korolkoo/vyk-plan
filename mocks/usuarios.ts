// vyk-plan/mocks/usuarios.ts
import type { User } from "@/types/types";

export const mockUsers: User[] = [
  { id: "usr_yuri", name: "Yuri", email: "yuri@vyk.local", image: null },
  { id: "usr_vithoria", name: "Vithória", email: "vithoria@vyk.local", image: null },
];

/** Usuário "logado" enquanto não há auth (Fase 2) */
export const mockCurrentUser: User = mockUsers[0];
