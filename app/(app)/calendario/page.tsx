import Link from "next/link";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { chaveDia, hora, doisDigitos, mesVizinho, NOMES_MES, DIAS_SEMANA, OFFSET } from "@/lib/datas";
import { COR_TIPO, ROTULO_TIPO } from "@/components/calendario/tipos";
import { criarSessao } from "./actions";

const campo = "mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5";

export default async function Calendario({ searchParams }: { searchParams: { mes?: string; equipa?: string; erro?: string } }) {
  const { supabase, perfil } = await obterPerfil();

  const hojeChave = chaveDia(new Date().toISOString());
  const mesTexto = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : hojeChave.slice(0, 7);
  const [ano, mes] = mesTexto.split("-").map(Number);
  const equipaFiltro = searchParams.equipa ?? "";

  const { data: equipas } = await supabase.from("equipas").select("id, nome").order("nome");

  const inicio = `${mesTexto}-01T00:00:00${OFFSET}`;
  const proximo = mesVizinho(ano, mes, 1);
  let consulta = supabase.from("sessoes").select("id, titulo, tipo, inicio, equipa_id").gte("inicio", inicio).lt("inicio", `${proximo}-01T00:00:00${OFFSET}`).order("inicio");
  if (equipaFiltro) consulta = consulta.eq("equipa_id", equipaFiltro);
  const { data: sessoes } = await consulta;

  const porDia: Record<string, any[]> = {};
  (sessoes ?? []).forEach((s) => { (porDia[chaveDia(s.inicio)] ??= []).push(s); });

  const primeiroDiaSemana = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay();
  const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const celulas: (number | null)[] = [...Array(primeiroDiaSemana).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)];
  while (celulas.length % 7) celulas.push(null);

  const link = (m: string) => `/calendario?mes=${m}${equipaFiltro ? `&equipa=${equipaFiltro}` : ""}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={link(mesVizinho(ano, mes, -1))} aria-label="Mês anterior" className="rounded-md border border-linha bg-white px-3 py-2">‹</Link>
          <h1 className="min-w-48 text-center font-titulo text-3xl font-bold">{NOMES_MES[mes - 1]} {ano}</h1>
          <Link href={link(mesVizinho(ano, mes, 1))} aria-label="Próximo mês" className="rounded-md border border-linha bg-white px-3 py-2">›</Link>
          <Link href={link(hojeChave.slice(0, 7))} className="text-sm text-quadra-600 underline">Hoje</Link>
        </div>
        <form action="/calendario" className="flex items-center gap-2">
          <input type="hidden" name="mes" value={mesTexto} />
          <select name="equipa" defaultValue={equipaFiltro} aria-label="Filtrar por equipa" className="rounded-md border border-linha bg-white px-3 py-2 text-sm">
            <option value="">Todas as equipas</option>
            {(equipas ?? []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <button className="rounded-md border border-linha bg-white px-3 py-2 text-sm">Filtrar</button>
        </form>
      </div>

      {searchParams.erro && <p role="alert" className="rounded-md bg-bola-100 px-3 py-2 text-sm">{searchParams.erro}</p>}

      <ul className="space-y-2 sm:hidden" aria-label="Sessões do mês">
        {(sessoes ?? []).length === 0 && <li className="rounded-lg border border-dashed border-linha bg-white p-4 text-suave">Nenhuma sessão neste mês.</li>}
        {(sessoes ?? []).map((s: any) => {
          const d = chaveDia(s.inicio);
          return (
            <li key={s.id}>
              <Link href={`/calendario/sessao/${s.id}`} className="flex items-center gap-3 rounded-lg border border-linha bg-white p-3">
                <span className="w-14 shrink-0 text-center leading-tight">
                  <span className="block text-xs text-suave">{DIAS_SEMANA[new Date(`${d}T12:00:00Z`).getUTCDay()]}</span>
                  <span className="block font-titulo text-xl font-bold">{d.slice(8)}/{d.slice(5, 7)}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.titulo}</span>
                  <span className="text-sm text-suave">{hora(s.inicio)}</span>
                </span>
                <span className={`rounded px-2 py-0.5 text-xs ${COR_TIPO[s.tipo]}`}>{ROTULO_TIPO[s.tipo]}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-lg border border-linha bg-white sm:block">
        <div className="grid min-w-[720px] grid-cols-7">
          {DIAS_SEMANA.map((d) => <div key={d} className="border-b border-linha px-2 py-2 text-center text-sm font-medium text-suave">{d}</div>)}
          {celulas.map((dia, i) => {
            const chave = dia ? `${mesTexto}-${doisDigitos(dia)}` : "";
            const doDia = dia ? porDia[chave] ?? [] : [];
            return (
              <div key={i} className={`min-h-28 border-b border-r border-linha p-1.5 ${dia ? "" : "bg-fundo"} ${chave === hojeChave ? "bg-bola-100" : ""}`}>
                {dia && <p className={`mb-1 text-sm ${chave === hojeChave ? "font-bold" : "text-suave"}`}>{dia}</p>}
                <ul className="space-y-1">
                  {doDia.map((s) => (
                    <li key={s.id}>
                      <Link href={`/calendario/sessao/${s.id}`} className={`block truncate rounded px-1.5 py-1 text-xs ${COR_TIPO[s.tipo]}`} title={`${ROTULO_TIPO[s.tipo]}: ${s.titulo}`}>
                        {hora(s.inicio)} {s.titulo}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <ul className="flex flex-wrap gap-4 text-sm">
        {Object.entries(ROTULO_TIPO).map(([k, v]) => (
          <li key={k} className="flex items-center gap-2"><span className={`h-3 w-3 rounded-sm ${COR_TIPO[k].split(" ")[0]}`} />{v}</li>
        ))}
      </ul>

      {podeEditar(perfil.papel, "calendario") && (
        (equipas ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-linha bg-white p-5 text-suave">Para agendar sessões, <Link href="/equipas" className="text-quadra-600 underline">crie uma equipa</Link> primeiro.</p>
        ) : (
          <form action={criarSessao} className="grid max-w-3xl gap-4 rounded-lg border border-linha bg-white p-5 sm:grid-cols-2">
            <h2 className="font-titulo text-xl font-semibold sm:col-span-2">Agendar sessão</h2>
            <label className="block text-sm font-medium">Equipa
              <select name="equipa" required defaultValue={equipaFiltro} className={campo}>
                {(equipas ?? []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">Tipo
              <select name="tipo" className={campo}>
                {Object.entries(ROTULO_TIPO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium sm:col-span-2">Título
              <input name="titulo" required placeholder="Ex.: Defesa 6:0 e saída de contra-ataque" className={campo} />
            </label>
            <label className="block text-sm font-medium">Data e hora
              <input name="inicio" type="datetime-local" required className={campo} />
            </label>
            <label className="block text-sm font-medium">Duração (minutos)
              <input name="duracao" type="number" min={10} max={300} defaultValue={90} className={campo} />
            </label>
            <label className="block text-sm font-medium">Local
              <input name="local" className={campo} />
            </label>
            <label className="block text-sm font-medium">Adversário (se for jogo)
              <input name="adversario" className={campo} />
            </label>
            <div className="sm:col-span-2">
              <button className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90">Agendar</button>
            </div>
          </form>
        )
      )}
    </div>
  );
}
