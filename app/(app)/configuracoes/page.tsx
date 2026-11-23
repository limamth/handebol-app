import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar, podeVer } from "@/lib/permissions";
import { Aviso } from "@/components/ui/Aviso";
import { MODULOS_CONFIGURAVEIS, carregarDesativados } from "@/lib/configuracoes";
import { alterarModulo } from "./actions";

export default async function Configuracoes({ searchParams }: { searchParams: { aviso?: string; erro?: string } }) {
  const { perfil } = await obterPerfil();
  if (!podeVer(perfil.papel, "configuracoes")) redirect("/dashboard");
  const editar = podeEditar(perfil.papel, "configuracoes");
  const desativados = await carregarDesativados();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />
      <header>
        <h1 className="font-titulo text-3xl font-bold">Configurações</h1>
        <p className="text-suave">Ative ou desative as funções do app. Uma função desativada fica acinzentada no menu para a equipe, some do menu dos atletas e não abre. Nada é apagado: os dados continuam guardados e tudo volta quando você ativar de novo.</p>
      </header>

      <ul className="space-y-3">
        {MODULOS_CONFIGURAVEIS.map((m) => {
          const ativo = !desativados.includes(m.chave);
          return (
            <li key={m.chave} className="flex items-start justify-between gap-4 rounded-lg border border-linha bg-white p-4">
              <div className="min-w-0">
                <p className="font-medium">{m.rotulo}</p>
                <p className="text-sm text-suave">{m.descricao}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {editar ? (
                  <form action={alterarModulo.bind(null, m.chave, !ativo)}>
                    <button role="switch" aria-checked={ativo} aria-label={`${m.rotulo}: ${ativo ? "ativada, tocar para desativar" : "desativada, tocar para ativar"}`}
                      className={`relative h-7 w-12 rounded-full transition-colors ${ativo ? "bg-emerald-600" : "bg-slate-400"}`}>
                      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${ativo ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                  </form>
                ) : null}
                <span className={`text-xs font-medium ${ativo ? "text-emerald-700" : "text-suave"}`}>{ativo ? "Ativada" : "Desativada"}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-sm text-suave">Equipas, Utilizadores, Backup e Configurações ficam sempre ativas. {editar ? "" : "Só a gestão e a comissão técnica alteram estas opções."}</p>
    </div>
  );
}
