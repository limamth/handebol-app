import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { obterPerfil } from "@/lib/sessao";
import { carregarDesativados } from "@/lib/configuracoes";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await obterPerfil();
  const desativados = await carregarDesativados();

  return (
    <div className="flex min-h-screen">
      <Sidebar papel={perfil.papel} desativados={desativados} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar nome={perfil.nome} papel={perfil.papel} desativados={desativados} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
