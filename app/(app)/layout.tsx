import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { obterPerfil } from "@/lib/sessao";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await obterPerfil();

  return (
    <div className="flex min-h-screen">
      <Sidebar papel={perfil.papel} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar nome={perfil.nome} papel={perfil.papel} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
