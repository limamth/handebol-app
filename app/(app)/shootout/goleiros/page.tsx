import Link from "next/link";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { Aviso } from "@/components/ui/Aviso";
import { COR_ESTILO } from "@/components/shootout/estilos";
import { ESTILOS_GOLEIRO, carregarAtletas, carregarGoleiros } from "@/lib/shootout";
import { adicionarGoleiro, atualizarGoleiro, removerGoleiro } from "../actions";

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5";

export default async function Goleiros({ searchParams }: { searchParams: { aviso?: string; erro?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  const editar = podeEditar(perfil.papel, "shootout");
  const [atletas, goleiros] = await Promise.all([carregarAtletas(supabase), carregarGoleiros(supabase)]);

  const lista = [...goleiros.entries()].map(([id, g]) => ({ id, ...g, nome: atletas.get(id)?.nome ?? "Goleiro", posicao: atletas.get(id)?.posicao ?? null })).sort((a, b) => a.nome.localeCompare(b.nome));
  const candidatos = [...atletas.entries()].filter(([id, a]) => a.ativo && !goleiros.has(id)).sort((a, b) => a[1].nome.localeCompare(b[1].nome));

  return (
    <div className="space-y-5">
      <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />
      <p className="text-sm text-suave">Qualquer atleta pode defender no shoot-out, seja qual for a posição dele. “Adversários de fora” e “Atleta de equipes de fora” já ficam sempre disponíveis no Registro.</p>

      {lista.length === 0 ? (
        <p className="rounded-lg border border-dashed border-linha bg-white p-6 text-suave">Nenhum goleiro de shoot-out cadastrado.</p>
      ) : (
        <ul className="space-y-3">
          {lista.map((g) => (
            <li key={g.id} className="rounded-lg border border-linha bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/atletas/${g.id}`} className="font-medium text-quadra-600 underline">{g.nome}</Link>
                {g.posicao && <span className="text-sm text-suave">{g.posicao}</span>}
                <span className={`rounded px-2 py-0.5 text-xs ${COR_ESTILO[g.estilo]}`}>{ESTILOS_GOLEIRO[g.estilo]}</span>
                {!g.ativo && <span className="rounded bg-slate-500 px-2 py-0.5 text-xs text-white">Inativo</span>}
              </div>
              {g.observacoes && <p className="mt-1 text-sm text-suave">{g.observacoes}</p>}
              {editar && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-suave underline">Editar</summary>
                  <form action={atualizarGoleiro.bind(null, g.id)} className="mt-2 grid gap-3 rounded-md bg-fundo p-3 sm:grid-cols-2">
                    <label className="block font-medium">Estilo
                      <select name="estilo" defaultValue={g.estilo} className={campo}>{Object.entries(ESTILOS_GOLEIRO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                    </label>
                    <label className="flex items-center gap-2 self-end pb-2"><input name="ativo" type="checkbox" defaultChecked={g.ativo} /> Ativo no Registro</label>
                    <label className="block font-medium sm:col-span-2">Observações técnicas
                      <textarea name="observacoes" rows={2} maxLength={500} defaultValue={g.observacoes ?? ""} className={campo} placeholder="Ex.: bom para o lado direito, fecha bem o ângulo" />
                    </label>
                    <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                      <button className="rounded-md bg-bola-500 px-4 py-2 font-semibold text-white hover:opacity-90">Salvar alterações</button>
                      <button formAction={removerGoleiro.bind(null, g.id)} formNoValidate className="text-suave underline">Remover da lista</button>
                    </div>
                    <p className="text-xs text-suave sm:col-span-2">Prefira desmarcar “Ativo” em vez de remover: as batidas já registradas contra ele continuam, mas sem o estilo, e saem dos filtros Baliza e Saída.</p>
                  </form>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}

      {editar && (
        <form action={adicionarGoleiro} className="grid gap-4 rounded-lg border border-linha bg-white p-5 sm:grid-cols-2">
          <h2 className="font-titulo text-xl font-semibold sm:col-span-2">Cadastrar goleiro de shoot-out</h2>
          <label className="block text-sm font-medium">Atleta
            <select name="atleta" required defaultValue="" className={campo}>
              <option value="" disabled>Escolha o atleta</option>
              {candidatos.map(([id, a]) => <option key={id} value={id}>{a.nome}{a.posicao ? ` (${a.posicao})` : ""}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Estilo
            <select name="estilo" required defaultValue="" className={campo}>
              <option value="" disabled>Baliza ou Saída</option>
              {Object.entries(ESTILOS_GOLEIRO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium sm:col-span-2">Observações técnicas (opcional)
            <textarea name="observacoes" rows={2} maxLength={500} className={campo} />
          </label>
          <div className="sm:col-span-2"><button className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">Cadastrar goleiro</button></div>
        </form>
      )}
    </div>
  );
}
