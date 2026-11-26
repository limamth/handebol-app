import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function criarClienteServidor() {
  const cookieStore = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (lista: { name: string; value: string; options?: any }[]) => {
        try { lista.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* chamado de Server Component: o middleware renova a sessão */ }
      },
    },
  });
}
