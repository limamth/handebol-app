import { exigirModuloAtivo } from "@/lib/configuracoes";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await exigirModuloAtivo("bemestar");
  return <>{children}</>;
}
