import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas que não exigem login
  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth");

  // Cookie de sessão padrão do Better Auth
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  // Se não está autenticado e tenta acessar rota protegida -> redireciona para /login
  if (!sessionCookie && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Se já está autenticado e tenta acessar /login -> redireciona para a home /
  if (sessionCookie && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Aplica em todas as rotas exceto:
     * - _next/static (arquivos compilados)
     * - _next/image (otimização de imagens)
     * - favicon.ico, ícones e assets públicos
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
