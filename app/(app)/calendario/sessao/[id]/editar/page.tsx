import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { FUSO } from "@/lib/datas";
import { ROTULO_TIPO } from "@/components/calendario/tipos";
import { Aviso } from "@/components/ui/Aviso";
import { atualizarSessao } from "../../../actions";

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5";

export default async function EditarSessao({ params, searchParams }: { params: { id: string }; searchParams: { erro?: string } }) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "calendario")) redirect(`/calendario/sessao/${params.id}`);

  const { data: s } = await supabase.from("sessoes").select("id, tipo, titulo, inicio, duracao_min, local, adversario, observacoes, equipas(nome)").eq("id", params.id).single();
  if (!s) notFound();

  // Data e hora no formato do campo (AAAA-MM-DDTHH:mm), no fuso de Brasília
  const inicioLocal = new Intl.DateTimeFormat("sv-SE", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(new Date(s.inicio)).replace(" ", "T");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Aviso key={Date.now()} mensagem={searchParams.erro} tipo="erro" />
      <Link href={`/calendario/sessao/${s.id}`} className="text-sm text-quadra-600 underline">Voltar para a sessão</Link>
      <h1 className="font-titulo text-3xl font-bold">Editar sessão</h1>
      <p className="text-suave">Equipa: {(s.equipas as any)?.nome}</p>

      <form action={atualizarSessao.bind(null, s.id)} className="grid gap-4 rounded-lg border border-linha bg-white p-5 sm:grid-cols-2">
        <label className="block text-sm font-medium">Tipo
          <select name="tipo" defaultValue={s.tipo} className={campo}>
            {Object.entries(ROTULO_TIPO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">Data e hora
          <input name="inicio" type="datetime-local" required defaultValue={inicioLocal} className={campo} />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">Título
          <input name="titulo" required defaultValue={s.titulo} className={campo} />
        </label>
        <label className="block text-sm font-medium">Duração (minutos)
          <input name="duracao" type="number" min={10} max={300} defaultValue={s.duracao_min} className={campo} />
        </label>
        <label className="block text-sm font-medium">Local
          <input name="local" defaultValue={s.local ?? ""} className={campo} />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">Adversário (se for jogo)
          <input name="adversario" defaultValue={s.adversario ?? ""} className={campo} />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">Observações
          <textarea name="observacoes" rows={3} defaultValue={s.observacoes ?? ""} className={campo} />
        </label>
        <div className="sm:col-span-2"><button className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">Salvar alterações</button></div>
      </form>
    </div>
  );
}
