import Link from "next/link";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { PERMISSOES, podeEditar, podeVer, type Modulo } from "@/lib/permissions";
import { DESCRICAO_PAPEL, PAPEIS_CADASTRAVEIS, ROTULO_MODULO, ROTULO_PAPEL } from "@/lib/papeis";
import { Aviso } from "@/components/ui/Aviso";
import { BotaoImprimir } from "@/components/ui/BotaoImprimir";
import { atualizarMembro, criarMembro, excluirUsuario, gerarCodigoMembro, gerarCodigosPendentes, redefinirAcesso } from "./actions";
import type { Papel } from "@/types";

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5";
const ABAS = [{ id: "comissao", rotulo: "Gestão e comissão técnica" }, { id: "atletas", rotulo: "Atletas" }, { id: "perfis", rotulo: "Perfis de acesso" }];
const um = (o: any) => (Array.isArray(o) ? o[0] : o);

export default async function Utilizadores({ searchParams }: { searchParams: { aba?: string; aviso?: string; erro?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeVer(perfil.papel, "utilizadores")) redirect("/dashboard");

  const aba = ABAS.some((a) => a.id === searchParams.aba) ? searchParams.aba! : "comissao";
  const gestor = podeEditar(perfil.papel, "utilizadores");
  const podeGerarCodigos = ["gestor", "comissao_tecnica"].includes(perfil.papel);

  const { data: convites } = await supabase.from("convites").select("usuario_id, codigo");
  const codigoDe = new Map<string, string>((convites ?? []).map((c) => [c.usuario_id as string, c.codigo as string]));
  const acesso = (u: any) => (u.auth_id ? "Conta criada" : codigoDe.get(u.id) ? `Código: ${codigoDe.get(u.id)}` : "Sem acesso");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />
      <h1 className="font-titulo text-3xl font-bold print:hidden">Utilizadores</h1>

      <nav aria-label="Seções" className="flex gap-2 print:hidden">
        {ABAS.map((a) => (
          <Link key={a.id} href={`/utilizadores?aba=${a.id}`} aria-current={aba === a.id ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm ${aba === a.id ? "border-quadra-900 bg-quadra-900 text-white" : "border-linha bg-white"}`}>{a.rotulo}</Link>
        ))}
      </nav>

      {aba === "comissao" && <Comissao supabase={supabase} perfilId={perfil.id} gestor={gestor} acesso={acesso} codigoDe={codigoDe} />}
      {aba === "atletas" && <Atletas supabase={supabase} podeGerarCodigos={podeGerarCodigos} gestor={gestor} acesso={acesso} />}
      {aba === "perfis" && <Perfis />}
    </div>
  );
}

async function Comissao({ supabase, perfilId, gestor, acesso, codigoDe }: { supabase: any; perfilId: string; gestor: boolean; acesso: (u: any) => string; codigoDe: Map<string, string> }) {
  const { data: membros } = await supabase.from("usuarios").select("id, nome, papel, ativo, auth_id").neq("papel", "atleta").order("nome");

  return (
    <>
      <section className="overflow-x-auto rounded-lg border border-linha bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linha text-suave">
            <tr><th className="px-4 py-3 font-medium">Nome</th><th className="px-4 py-3 font-medium">Perfil</th><th className="px-4 py-3 font-medium">Acesso</th><th className="px-4 py-3 font-medium">Situação</th>{gestor && <th className="px-4 py-3 font-medium">Ações</th>}</tr>
          </thead>
          <tbody className="divide-y divide-linha align-top">
            {(membros ?? []).map((m: any) => (
              <tr key={m.id}>
                <td className="px-4 py-3 font-medium">{m.nome}{m.id === perfilId ? <span className="ml-2 text-xs text-suave">(você)</span> : null}</td>
                <td className="px-4 py-3">{ROTULO_PAPEL[m.papel as Papel]}</td>
                <td className="px-4 py-3 font-mono text-xs">{acesso(m)}</td>
                <td className="px-4 py-3">{m.ativo === false ? "Desativado" : "Ativo"}</td>
                {gestor && (
                  <td className="px-4 py-3">
                    {m.id === perfilId ? <span className="text-suave">-</span> : (
                      <details>
                        <summary className="cursor-pointer text-quadra-600 underline">Editar</summary>
                        <form action={atualizarMembro.bind(null, m.id)} className="mt-2 grid min-w-64 gap-3 rounded-md bg-fundo p-3">
                          <label className="block font-medium">Nome<input name="nome" required defaultValue={m.nome} className={campo} /></label>
                          <label className="block font-medium">Perfil
                            <select name="papel" defaultValue={m.papel} className={campo}>{PAPEIS_CADASTRAVEIS.map((p) => <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>)}</select>
                          </label>
                          <label className="flex items-center gap-2"><input name="ativo" type="checkbox" defaultChecked={m.ativo !== false} /> Ativo (desmarcado, perde o acesso ao app)</label>
                          <button className="rounded-md bg-bola-500 px-4 py-2 font-semibold text-white hover:opacity-90">Salvar alterações</button>
                        </form>
                        {!m.auth_id && (
                          <form action={gerarCodigoMembro.bind(null, m.id)} className="mt-2">
                            <button className="rounded-md border border-linha px-3 py-1.5 hover:bg-fundo">{codigoDe.get(m.id) ? "Gerar novo código" : "Gerar código de acesso"}</button>
                          </form>
                        )}
                        {m.auth_id && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-suave underline">Redefinir acesso (esqueceu a senha)</summary>
                            <form action={redefinirAcesso.bind(null, m.id, "comissao")} className="mt-2 max-w-xs rounded-md bg-fundo p-3">
                              <p>Apaga o login atual de {m.nome} e gera um código novo. A pessoa usa o código em “primeiro acesso” para criar uma senha nova. O cadastro e o histórico continuam.</p>
                              <button className="mt-2 rounded-md bg-tinta px-3 py-1.5 text-white">Redefinir e gerar código</button>
                            </form>
                          </details>
                        )}
                        <details className="mt-3">
                          <summary className="cursor-pointer text-suave underline">Excluir usuário</summary>
                          <form action={excluirUsuario.bind(null, m.id, "comissao")} className="mt-2 max-w-xs rounded-md bg-bola-100 p-3">
                            <p>{m.nome} perde o acesso e o login dele é apagado. O que ele criou (sessões, exercícios, jogadas) continua no app. Essa ação não pode ser desfeita.</p>
                            <button className="mt-2 rounded-md bg-tinta px-3 py-1.5 text-white">Confirmar exclusão</button>
                          </form>
                        </details>
                      </details>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {gestor ? (
        <form action={criarMembro} className="grid max-w-2xl gap-4 rounded-lg border border-linha bg-white p-5 sm:grid-cols-2">
          <h2 className="font-titulo text-xl font-semibold sm:col-span-2">Cadastrar usuário de gestão ou comissão técnica</h2>
          <label className="block text-sm font-medium">Nome completo<input name="nome" required className={campo} /></label>
          <label className="block text-sm font-medium">Perfil
            <select name="papel" defaultValue="comissao_tecnica" className={campo}>{PAPEIS_CADASTRAVEIS.map((p) => <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>)}</select>
          </label>
          <p className="text-sm text-suave sm:col-span-2">Ao cadastrar, o app gera um código de acesso. A pessoa usa o código em “primeiro acesso” na tela de entrada para criar o próprio e-mail e senha. O código vale para uma conta só.</p>
          <div className="sm:col-span-2"><button className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">Cadastrar</button></div>
        </form>
      ) : (
        <p className="text-sm text-suave">Só o gestor cadastra e altera a comissão técnica.</p>
      )}
    </>
  );
}

async function Atletas({ supabase, podeGerarCodigos, gestor, acesso }: { supabase: any; podeGerarCodigos: boolean; gestor: boolean; acesso: (u: any) => string }) {
  const { data: atletas } = await supabase.from("usuarios").select("id, nome, ativo, auth_id, membros_equipa(equipas(nome))").eq("papel", "atleta").order("nome");
  const linhas = (atletas ?? []) as any[];

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        {podeGerarCodigos && (
          <form action={gerarCodigosPendentes}>
            <button className="rounded-md bg-bola-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Gerar códigos para quem ainda não tem</button>
          </form>
        )}
        <BotaoImprimir rotulo="Imprimir lista" />
      </div>
      <section className="overflow-x-auto rounded-lg border border-linha bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linha text-suave"><tr><th className="px-4 py-3 font-medium">Atleta</th><th className="px-4 py-3 font-medium">Equipas</th><th className="px-4 py-3 font-medium">Acesso</th><th className="px-4 py-3 font-medium">Situação</th>{gestor && <th className="px-4 py-3 font-medium print:hidden">Ações</th>}</tr></thead>
          <tbody className="divide-y divide-linha align-top">
            {linhas.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-suave">Nenhum atleta cadastrado.</td></tr>}
            {linhas.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium"><Link href={`/atletas/${a.id}`} className="text-quadra-600 underline">{a.nome}</Link></td>
                <td className="px-4 py-3">{(a.membros_equipa ?? []).map((m: any) => um(m.equipas)?.nome).filter(Boolean).join(", ") || "-"}</td>
                <td className="px-4 py-3 font-mono text-xs">{acesso(a)}</td>
                <td className="px-4 py-3">{a.ativo === false ? "Inativo" : "Ativo"}</td>
                {gestor && (
                  <td className="px-4 py-3 print:hidden">
                    {a.auth_id && (
                      <details className="mb-2">
                        <summary className="cursor-pointer text-suave underline">Redefinir acesso</summary>
                        <form action={redefinirAcesso.bind(null, a.id, "atletas")} className="mt-2 max-w-xs rounded-md bg-fundo p-3">
                          <p>Apaga o login atual de {a.nome} e gera um código novo para ele criar uma senha nova em “primeiro acesso”. O histórico continua.</p>
                          <button className="mt-2 rounded-md bg-tinta px-3 py-1.5 text-white">Redefinir e gerar código</button>
                        </form>
                      </details>
                    )}
                    <details>
                      <summary className="cursor-pointer text-suave underline">Excluir</summary>
                      <form action={excluirUsuario.bind(null, a.id, "atletas")} className="mt-2 max-w-xs rounded-md bg-bola-100 p-3">
                        <p>Isto apaga {a.nome} e todo o histórico: presenças, carga, bem-estar, testes e musculação. Se ele já criou conta, o login também é apagado. Essa ação não pode ser desfeita.</p>
                        <button className="mt-2 rounded-md bg-tinta px-3 py-1.5 text-white">Confirmar exclusão</button>
                      </form>
                    </details>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="text-sm text-suave print:hidden">Cada código vale para uma conta só e some da lista depois que o atleta cria o acesso. A impressão desta lista inclui os códigos pendentes, então guarde-a com cuidado.</p>
    </>
  );
}

function Perfis() {
  const papeis = Object.keys(PERMISSOES) as Papel[];
  const modulos = Object.keys(ROTULO_MODULO) as Modulo[];
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2">
        {papeis.map((p) => (
          <div key={p} className="rounded-lg border border-linha bg-white p-4">
            <p className="font-titulo text-lg font-semibold">{ROTULO_PAPEL[p]}</p>
            <p className="text-sm text-suave">{DESCRICAO_PAPEL[p]}</p>
          </div>
        ))}
      </section>
      <section className="overflow-x-auto rounded-lg border border-linha bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linha text-suave">
            <tr><th className="px-4 py-3 font-medium">Perfil</th>{modulos.map((m) => <th key={m} className="px-3 py-3 font-medium">{ROTULO_MODULO[m]}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-linha">
            {papeis.map((p) => (
              <tr key={p}>
                <td className="px-4 py-3 font-medium">{ROTULO_PAPEL[p]}</td>
                {modulos.map((m) => {
                  const nivel = PERMISSOES[p][m];
                  return <td key={m} className="px-3 py-3">{nivel === "editar" ? "Edita" : nivel === "ver" ? "Vê" : <span className="text-suave" aria-label="Sem acesso">—</span>}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="text-sm text-suave">O atleta edita só os próprios treinos de musculação. Os perfis são fixos no app. Se a comissão quiser mudar o que algum perfil pode fazer, me avise.</p>
    </>
  );
}
