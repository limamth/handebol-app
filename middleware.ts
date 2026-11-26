import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista: { name: string; value: string; options?: any }[]) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const emLogin = request.nextUrl.pathname.startsWith("/login");

  if (!user && !emLogin) return NextResponse.redirect(new URL("/login", request.url));
  if (user && emLogin) return NextResponse.redirect(new URL("/dashboard", request.url));
  return resposta;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|offline.html|manifest.webmanifest|icons/).*)"] };
