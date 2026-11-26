import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { StatusConexao } from "@/components/ui/StatusConexao";
import { AlertaAtletaPendente } from "@/components/notificacoes/AlertaAtletaPendente";
import { GerenciadorPermissaoPush } from "@/components/notificacoes/GerenciadorPermissaoPush";
import { obterPerfil, podeVerScout } from "@/lib/sessao";
import { carregarDesativados } from "@/lib/configuracoes";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await obterPerfil();
  const desativadosBase = await carregarDesativados();
  const desativados =
    perfil.papel === "atleta" && !podeVerScout(perfil) && !desativadosBase.includes("scout")
      ? [...desativadosBase, "scout"]
      : desativadosBase;

  return (
    <div className="flex min-h-screen">
      <Sidebar papel={perfil.papel} desativados={desativados} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar nome={perfil.nome} papel={perfil.papel} desativados={desativados} />
        <StatusConexao />
        <AlertaAtletaPendente perfilId={perfil.id} papel={perfil.papel} clubeId={perfil.clube_id} />
        <div className="px-4 pt-2 md:px-6">
          <GerenciadorPermissaoPush />
        </div>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
