import Link from "next/link";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { Aviso } from "@/components/ui/Aviso";
import { SeletorSessao } from "@/components/shootout/SeletorSessao";
import { TIPOS_BATIDA, carregarAtletas, carregarGoleiros, dataBr, fmtPct, pct } from "@/lib/shootout";
import { desfazerUltima, registrarBatida } from "../actions";

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-3";
type Busca = { sessao?: string; batedor?: string; goleiro?: string; tipo?: string; aviso?: string; erro?: string };

export default async function Registro({ searchParams }: { searchParams: Busca }) {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "shootout")) redirect("/shootout");

  const [{ data: sessoes }, atletas, goleiros] = await Promise.all([
    supabase.from("shootout_sessoes").select("id, nome, data").order("data", { ascending: false }).order("criado_em", { ascending: false }).limit(60),
    carregarAtletas(supabase),
    carregarGoleiros(supabase),
  ]);
  const aviso = <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />;
  const lista = (sessoes ?? []) as { id: string; nome: string | null; data: string }[];

  if (lista.length === 0) {
    return (
      <>
        {aviso}
        <p className="rounded-lg border border-dashed border-linha bg-white p-6 text-suave">Ainda não há sessão de shoot-out. <Link href="/shootout/sessoes" className="text-quadra-600 underline">Crie a primeira sessão</Link> para registrar batidas.</p>
      </>
    );
  }

  const sessaoId = lista.some((s) => s.id === searchParams.sessao) ? searchParams.sessao! : lista[0].id;
  const batedor = searchParams.batedor ?? "";
  const goleiro = searchParams.goleiro ?? "";
  const tipoSel = searchParams.tipo && searchParams.tipo in TIPOS_BATIDA ? searchParams.tipo : "";

  const { data: daSessao } = await supabase.from("shootout_batidas").select("resultado, batedor_id").eq("shootout_sessao_id", sessaoId);
  const batidas = (daSessao ?? []) as { resultado: string; batedor_id: string | null }[];
  const conv = batidas.filter((b) => b.resultado === "convertido").length;
  const doBatedor = batedor ? batidas.filter((b) => (batedor === "externo" ? b.batedor_id === null : b.batedor_id === batedor)) : [];
  const convBatedor = doBatedor.filter((b) => b.resultado === "convertido").length;
  const nomeBatedor = batedor === "externo" ? "Atleta de equipes de fora" : atletas.get(batedor)?.nome;

  const batedores = [...atletas.entries()].filter(([, a]) => a.ativo).sort((a, b) => a[1].nome.localeCompare(b[1].nome));
  const goleirosAtivos = [...goleiros.entries()].filter(([, g]) => g.ativo).map(([id]) => ({ id, nome: atletas.get(id)?.nome ?? "Goleiro" })).sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {aviso}
      <SeletorSessao atual={sessaoId} outros={{ batedor, goleiro, tipo: tipoSel }}
        sessoes={lista.map((s) => ({ id: s.id, rotulo: `${s.nome ?? "Sessão"} · ${dataBr(s.data)}` }))} />

      <div className="grid grid-cols-3 gap-3" aria-label="Contadores da sessão">
        <div className="rounded-lg border border-linha bg-white p-3"><p className="text-xs text-suave">Batidas</p><p className="font-titulo text-3xl font-bold">{batidas.length}</p></div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs text-suave">Convertidas</p><p className="font-titulo text-3xl font-bold">{conv}</p></div>
        <div className="rounded-lg border border-linha bg-white p-3"><p className="text-xs text-suave">Aproveitamento</p><p className="font-titulo text-3xl font-bold">{fmtPct(pct(conv, batidas.length))}</p></div>
      </div>

      <form action={registrarBatida} className="space-y-4 rounded-lg border border-linha bg-white p-4">
        <input type="hidden" name="sessao" value={sessaoId} />
        <label className="block text-sm font-medium">Atleta que bate
          <select name="batedor" required defaultValue={batedor} className={campo}>
            <option value="" disabled>Escolha o atleta</option>
            {batedores.map(([id, a]) => <option key={id} value={id}>{a.nome}</option>)}
            <option value="externo">Atleta de equipes de fora</option>
          </select>
        </label>
        <label className="block text-sm font-medium">Goleiro
          <select name="goleiro" required defaultValue={goleiro} className={campo}>
            <option value="" disabled>Escolha o goleiro</option>
            {goleirosAtivos.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            <option value="externo">Adversários de fora</option>
          </select>
        </label>
        {goleirosAtivos.length === 0 && <p className="text-sm text-suave">Nenhum goleiro de shoot-out cadastrado ainda. <Link href="/shootout/goleiros" className="text-quadra-600 underline">Cadastre em Goleiros</Link>.</p>}

        <fieldset>
          <legend className="text-sm font-medium">Tipo de batida (opcional)</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {[["", "Sem tipo"], ...Object.entries(TIPOS_BATIDA)].map(([valor, rotulo]) => (
              <label key={valor}>
                <input type="radio" name="tipo" value={valor} defaultChecked={tipoSel === valor} className="peer sr-only" />
                <span className="block cursor-pointer rounded-full border border-linha px-4 py-2 text-sm peer-checked:border-quadra-600 peer-checked:bg-quadra-600 peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-bola-500">{rotulo}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block text-sm font-medium">Observação (opcional)
          <input name="observacao" maxLength={300} className={campo} placeholder="Ex.: bateu no canto esquerdo" />
        </label>

        {nomeBatedor && (
          <p className="rounded-md bg-fundo px-3 py-2 text-sm">{nomeBatedor} nesta sessão: <strong>{fmtPct(pct(convBatedor, doBatedor.length))}</strong> ({convBatedor}/{doBatedor.length})</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button name="resultado" value="convertido" className="rounded-lg bg-emerald-700 py-5 text-lg font-semibold text-white hover:opacity-90">Convertido</button>
          <button name="resultado" value="perdido" className="rounded-lg bg-red-700 py-5 text-lg font-semibold text-white hover:opacity-90">Perdido</button>
        </div>
      </form>

      <form action={desfazerUltima.bind(null, sessaoId)} className="text-center">
        <input type="hidden" name="batedor" value={batedor} />
        <input type="hidden" name="goleiro" value={goleiro} />
        <input type="hidden" name="tipo" value={tipoSel} />
        <button className="text-sm text-suave underline" disabled={batidas.length === 0}>Desfazer a última batida desta sessão</button>
      </form>
    </div>
  );
}
