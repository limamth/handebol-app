import Link from "next/link";
import { redirect } from "next/navigation";
import { obterPerfil, podeVerScout } from "@/lib/sessao";
import { exigirModuloAtivo } from "@/lib/configuracoes";
import { podeEditar } from "@/lib/permissions";
import { SeletorAtletasScout, type AtletaAcessoScout } from "@/components/scouting/SeletorAtletasScout";
import {
  carregarEquipesAdversarias,
  carregarAtletasAdversarios,
  carregarFinalizacoesAdversarias,
  calcularEstatisticasBaliza,
  calcularEstatisticasSaida,
  calcularEstatisticasJogo,
  ROTULO_QUADRANTE,
  ROTULO_TECNICA_SAIDA,
  ROTULO_TIPO_JOGO,
  ROTULO_SETOR_JOGO,
  TIPOS_ARREMESSO_JOGO,
  SETORES_ORIGEM_JOGO,
  type QuadranteBaliza,
  type SetorOrigemJogo,
  type TecnicaSaida,
  type TipoArremessoJogo,
} from "@/lib/scouting";
import { carregarAtletas, carregarGoleiros } from "@/lib/shootout";
import { BalizaInterativa } from "@/components/scouting/BalizaInterativa";
import { SeletorTecnicaSaida } from "@/components/scouting/SeletorTecnicaSaida";
import { VisualizacaoSetoresQuadra } from "@/components/scouting/VisualizacaoSetoresQuadra";
import { CartaoIndicador } from "@/components/dashboard/CartaoIndicador";
import { Aviso } from "@/components/ui/Aviso";
import { Target, Shield, Flame, Activity, PlusCircle, Crosshair } from "lucide-react";
import { atualizarScoutBatida, excluirScoutBatida } from "@/app/(app)/shootout/adversarios/actions";

export default async function PaginaScout({
  searchParams,
}: {
  searchParams: {
    equipe?: string;
    atleta?: string;
    aviso?: string;
    erro?: string;
    modo?: string;
    setor?: string;
    tipo?: string;
  };
}) {
  await exigirModuloAtivo("scout");
  const { supabase, perfil } = await obterPerfil();
  if (!podeVerScout(perfil)) {
    redirect("/dashboard");
  }
  const editar = podeEditar(perfil.papel, "scout");

  const [equipes, nossosAtletas, nossosGoleirosMap, usuariosAtletasRes] = await Promise.all([
    carregarEquipesAdversarias(supabase),
    carregarAtletas(supabase),
    carregarGoleiros(supabase),
    editar
      ? supabase
          .from("usuarios")
          .select("*")
          .eq("clube_id", perfil.clube_id)
          .eq("papel", "atleta")
          .order("nome")
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const atletasAcessoScout: AtletaAcessoScout[] = ((usuariosAtletasRes.data ?? []) as any[]).map(
    (u) => ({
      id: u.id,
      nome: u.nome,
      pode_ver_scout: Boolean(u.pode_ver_scout),
    })
  );

  const nossosGoleiros = [...nossosGoleirosMap.keys()].map((id) => ({
    id,
    nome: nossosAtletas.get(id)?.nome ?? "Goleiro",
  }));

  const equipeId = searchParams.equipe && equipes.some((e) => e.id === searchParams.equipe)
    ? searchParams.equipe
    : equipes[0]?.id ?? "";

  const atletas = equipeId ? await carregarAtletasAdversarios(supabase, equipeId) : [];
  const atletaId = searchParams.atleta && atletas.some((a) => a.id === searchParams.atleta)
    ? searchParams.atleta
    : "";

  // Modo padrão do Scout: "jogo" (ou "shootout" se especificado)
  const ehModoShootout = searchParams.modo === "shootout";
  const modoOrigem = ehModoShootout ? "shootout" : "jogo";

  const finalizacoes = equipeId
    ? await carregarFinalizacoesAdversarias(supabase, {
        equipeId,
        atletaId: atletaId || undefined,
        origem: modoOrigem,
      })
    : [];

  const atletaSelecionado = atletas.find((a) => a.id === atletaId);
  const equipeSelecionada = equipes.find((e) => e.id === equipeId);

  // Filtros interativos por área da quadra ou tipo de arremesso (apenas no modo jogo)
  const setorFiltro: SetorOrigemJogo | "6m" | null =
    !ehModoShootout &&
    searchParams.setor &&
    (searchParams.setor === "6m" || SETORES_ORIGEM_JOGO.includes(searchParams.setor as SetorOrigemJogo))
      ? (searchParams.setor as SetorOrigemJogo | "6m")
      : null;

  const tipoFiltro: TipoArremessoJogo | null =
    !ehModoShootout &&
    searchParams.tipo &&
    TIPOS_ARREMESSO_JOGO.includes(searchParams.tipo as TipoArremessoJogo)
      ? (searchParams.tipo as TipoArremessoJogo)
      : null;

  const correspondeSetor = (f: (typeof finalizacoes)[number], setor: SetorOrigemJogo | "6m") =>
    setor === "6m" ? f.tipoFinalizacao === "6m" : f.zonaCampo === setor && f.tipoFinalizacao !== "6m";

  const finalizacoesFiltradas = finalizacoes.filter((f) => {
    if (setorFiltro && !correspondeSetor(f, setorFiltro)) return false;
    if (tipoFiltro && f.tipoFinalizacao !== tipoFiltro) return false;
    return true;
  });

  const urlScout = (overrides?: { setor?: string | null; tipo?: string | null }) => {
    const p = new URLSearchParams();
    if (equipeId) p.set("equipe", equipeId);
    if (atletaId) p.set("atleta", atletaId);
    p.set("modo", ehModoShootout ? "shootout" : "jogo");
    const nextSetor = overrides && "setor" in overrides ? overrides.setor : setorFiltro;
    const nextTipo = overrides && "tipo" in overrides ? overrides.tipo : tipoFiltro;
    if (nextSetor) p.set("setor", nextSetor);
    if (nextTipo) p.set("tipo", nextTipo);
    return `/scout?${p.toString()}`;
  };

  const urlAtual = urlScout();

  // Estatísticas calculadas (com cross-filtering entre setor e tipo de arremesso)
  const statsJogo = !ehModoShootout ? calcularEstatisticasJogo(finalizacoesFiltradas) : null;
  const statsParaSetores = !ehModoShootout
    ? calcularEstatisticasJogo(
        tipoFiltro ? finalizacoes.filter((f) => f.tipoFinalizacao === tipoFiltro) : finalizacoes
      )
    : null;
  const statsParaTipos = !ehModoShootout
    ? calcularEstatisticasJogo(
        setorFiltro ? finalizacoes.filter((f) => correspondeSetor(f, setorFiltro)) : finalizacoes
      )
    : null;
  const statsBalizaJogo = !ehModoShootout
    ? calcularEstatisticasBaliza(finalizacoesFiltradas.filter((f) => f.quadranteBaliza))
    : null;
  const statsBaliza = ehModoShootout ? calcularEstatisticasBaliza(finalizacoes) : null;
  const statsSaida = ehModoShootout ? calcularEstatisticasSaida(finalizacoes) : null;

  // Métricas do Shoot-out
  const totalSO = finalizacoes.length;
  const golsSO = finalizacoes.filter((f) => f.resultado === "convertido").length;
  const aproveitamentoSO = totalSO ? `${Math.round((golsSO / totalSO) * 100)}%` : "-";

  const aprovBalizaPct = statsBaliza?.total ? Math.round((statsBaliza.gols / statsBaliza.total) * 100) : null;
  const aprovBaliza = aprovBalizaPct !== null ? `${aprovBalizaPct}% (${statsBaliza!.gols}/${statsBaliza!.total})` : "-";

  const aprovSaidaPct = statsSaida?.total ? Math.round((statsSaida.gols / statsSaida.total) * 100) : null;
  const aprovSaida = aprovSaidaPct !== null ? `${aprovSaidaPct}% (${statsSaida!.gols}/${statsSaida!.total})` : "-";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* 1. Cabeçalho Principal com Botões de Ação Direta */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-linha pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Crosshair className="h-7 w-7 text-quadra-900" />
            <h1 className="font-titulo text-3xl font-bold">Scout de Adversários</h1>
          </div>
          <p className="text-suave text-sm mt-0.5">
            Inteligência tática competitiva: análise de finalizações de jogo e batidas de shoot-out dos adversários.
          </p>
        </div>

        {editar && (
          <div className="flex flex-wrap items-center gap-2.5">
            <SeletorAtletasScout atletasIniciais={atletasAcessoScout} />
            <Link
              href={`/scout/registro?modo=jogo${equipeId ? `&equipe=${equipeId}` : ""}${atletaId ? `&atleta=${atletaId}` : ""}`}
              className="inline-flex items-center gap-2 rounded-lg bg-bola-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-95 transition"
            >
              <span>🤾</span> + Registrar Arremesso de Jogo
            </Link>
            <Link
              href={`/scout/registro?modo=shootout${equipeId ? `&equipe=${equipeId}` : ""}${atletaId ? `&atleta=${atletaId}` : ""}`}
              className="inline-flex items-center gap-2 rounded-lg bg-quadra-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-95 transition"
            >
              <span>🎯</span> + Registrar Shoot-out
            </Link>
          </div>
        )}
      </div>

      <Aviso key={Date.now()} mensagem={searchParams.erro ?? searchParams.aviso} tipo={searchParams.erro ? "erro" : "ok"} />

      {/* 2. Seletor de Escopo do Scout: Jogo vs Shoot-out */}
      <div className="flex items-center gap-2">
        <Link
          href={`/scout?equipe=${equipeId}${atletaId ? `&atleta=${atletaId}` : ""}&modo=jogo`}
          className={`rounded-lg px-4 py-2 text-sm font-bold transition flex items-center gap-2 ${
            !ehModoShootout
              ? "bg-quadra-900 text-white shadow-sm"
              : "border border-linha bg-white text-suave hover:text-tinta"
          }`}
        >
          <span>🤾</span> Scout de Jogo Regulamentar
        </Link>
        <Link
          href={`/scout?equipe=${equipeId}${atletaId ? `&atleta=${atletaId}` : ""}&modo=shootout`}
          className={`rounded-lg px-4 py-2 text-sm font-bold transition flex items-center gap-2 ${
            ehModoShootout
              ? "bg-quadra-900 text-white shadow-sm"
              : "border border-linha bg-white text-suave hover:text-tinta"
          }`}
        >
          <span>🎯</span> Scout de Shoot-out
        </Link>
      </div>

      {equipes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-linha bg-white p-10 text-center space-y-4">
          <p className="text-suave">Ainda não há equipes adversárias cadastradas no scout.</p>
          {editar && (
            <Link
              href="/scout/registro"
              className="inline-flex items-center gap-2 rounded-lg bg-quadra-900 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              <PlusCircle className="h-4 w-4" /> Cadastrar primeira equipe adversária
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* 3. Barra de Filtros: Equipe Rival e Atleta */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-linha bg-white p-4 shadow-sm">
            <form action="/scout" className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1">
              <input type="hidden" name="modo" value={ehModoShootout ? "shootout" : "jogo"} />

              <label className="text-sm font-semibold text-tinta">
                Equipe:
                <select
                  name="equipe"
                  defaultValue={equipeId}
                  className="ml-2 rounded-md border border-linha bg-white px-3 py-1.5 text-sm"
                >
                  {equipes.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome} {e.categoria ? `(${e.categoria})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-tinta">
                Atleta:
                <select
                  name="atleta"
                  defaultValue={atletaId}
                  className="ml-2 rounded-md border border-linha bg-white px-3 py-1.5 text-sm"
                >
                  <option value="">Todos da equipe</option>
                  {atletas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.numero ? `#${a.numero} ` : ""}{a.nome}
                    </option>
                  ))}
                </select>
              </label>

              <button className="rounded-md border border-linha bg-white px-4 py-1.5 text-sm font-semibold hover:bg-fundo">
                Filtrar
              </button>
            </form>

            {atletaSelecionado && (
              <div className="flex items-center gap-2 text-xs bg-quadra-100/40 border border-quadra-200 text-quadra-900 rounded-full px-3 py-1.5">
                <span className="font-bold">{atletaSelecionado.nome}</span>
                {atletaSelecionado.posicao && <span>· {atletaSelecionado.posicao}</span>}
                {atletaSelecionado.mao && <span>· {atletaSelecionado.mao}</span>}
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* ESCOPO A: SCOUT DE JOGO REGULAMENTAR                     */}
          {/* ======================================================== */}
          {!ehModoShootout && statsJogo && statsParaSetores && statsParaTipos && (
            <>
              {(setorFiltro || tipoFiltro) && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-bola-300 bg-bola-50/80 px-4 py-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-tinta">Filtro ativo:</span>
                    {setorFiltro && (
                      <Link
                        href={urlScout({ setor: null })}
                        scroll={false}
                        className="inline-flex items-center gap-1 rounded-full bg-quadra-900 px-3 py-1 font-semibold text-white hover:opacity-90"
                        title="Remover filtro de área"
                      >
                        Área: {setorFiltro === "6m" ? "Tiros de 6m" : ROTULO_SETOR_JOGO[setorFiltro]} ✕
                      </Link>
                    )}
                    {tipoFiltro && (
                      <Link
                        href={urlScout({ tipo: null })}
                        scroll={false}
                        className="inline-flex items-center gap-1 rounded-full bg-bola-500 px-3 py-1 font-semibold text-white hover:opacity-90"
                        title="Remover filtro de forma de arremesso"
                      >
                        Tipo: {ROTULO_TIPO_JOGO[tipoFiltro].rotulo} ✕
                      </Link>
                    )}
                  </div>
                  <Link
                    href={urlScout({ setor: null, tipo: null })}
                    scroll={false}
                    className="font-bold text-bola-600 hover:underline"
                  >
                    Limpar filtros
                  </Link>
                </div>
              )}

              {/* Cards de Métricas Quantitativas do Jogo */}
              <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <CartaoIndicador rotulo="Arremessos em Jogo" valor={String(statsJogo.total)} />
                <CartaoIndicador rotulo="Gols Convertidos" valor={String(statsJogo.gols)} />
                <CartaoIndicador
                  rotulo="Aproveitamento Geral"
                  valor={statsJogo.aproveitamentoGeral !== null ? `${Math.round(statsJogo.aproveitamentoGeral * 100)}%` : "-"}
                />
                <CartaoIndicador rotulo="Pontos Marcados" valor={`${statsJogo.pontosTotais} pts`} />
              </section>

              {/* Grid: Setores de Origem na Quadra e Baliza */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* 1. Setores de Origem na Quadra */}
                <div className="space-y-4 rounded-xl border border-linha bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-linha pb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-bola-500" />
                      <h2 className="font-titulo text-xl font-bold">Setores de Origem na Quadra</h2>
                    </div>
                    <span className="text-xs font-semibold text-suave">
                      {statsParaSetores.total} arremesso(s)
                    </span>
                  </div>

                  <VisualizacaoSetoresQuadra
                    modo="visualizacao"
                    estatisticas={statsParaSetores}
                    setorSelecionado={setorFiltro}
                    hrefsSetor={{
                      ...(Object.fromEntries(
                        SETORES_ORIGEM_JOGO.map((s) => [
                          s,
                          urlScout({ setor: setorFiltro === s ? null : s }),
                        ])
                      ) as Partial<Record<SetorOrigemJogo, string>>),
                      "6m": urlScout({ setor: setorFiltro === "6m" ? null : "6m" }),
                    }}
                  />
                </div>

                {/* 2. Destino na Baliza */}
                <div className="space-y-4 rounded-xl border border-linha bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-linha pb-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-quadra-600" />
                      <h2 className="font-titulo text-xl font-bold">Destino na Baliza</h2>
                    </div>
                    <span className="text-xs font-semibold text-suave">
                      {statsJogo.statsBaliza.total} finalização(ões)
                    </span>
                  </div>

                  {statsJogo.statsBaliza.total === 0 ? (
                    <p className="text-sm text-suave py-12 text-center">
                      Nenhum arremesso com região da baliza mapeada.
                    </p>
                  ) : (
                    <BalizaInterativa modo="heatmap" estatisticas={statsJogo.statsBaliza} />
                  )}
                </div>
              </div>

              {/* 3. Distribuição por Tipo de Arremesso (Giro, Aérea, Especialista, 1pt, 6m) */}
              <section className="rounded-xl border border-linha bg-white p-5 shadow-sm">
                <div className="border-b border-linha pb-3 mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-titulo text-xl font-bold">Distribuição por Tipo de Arremesso</h2>
                    <p className="text-xs text-suave mt-0.5">
                      Métricas de volume, conversão e pontuação gerada por fundamento.
                    </p>
                  </div>
                  {editar && (
                    <Link
                      href={`/scout/registro?modo=jogo&equipe=${equipeId}${atletaId ? `&atleta=${atletaId}` : ""}`}
                      className="text-xs font-semibold text-bola-500 hover:underline"
                    >
                      + Registrar novo arremesso
                    </Link>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {TIPOS_ARREMESSO_JOGO.map((tipo) => {
                    const info = statsParaTipos.porTipo[tipo];
                    const cfg = ROTULO_TIPO_JOGO[tipo];
                    const pctAprov = info.pctGol !== null ? Math.round(info.pctGol * 100) : null;
                    const ativoTipo = tipoFiltro === tipo;

                    return (
                      <Link
                        key={tipo}
                        href={urlScout({ tipo: ativoTipo ? null : tipo })}
                        scroll={false}
                        className={`rounded-lg border p-4 flex flex-col justify-between transition ${
                          ativoTipo
                            ? "border-quadra-900 bg-quadra-900 text-white shadow-md ring-2 ring-bola-500"
                            : "border-linha bg-fundo/40 hover:border-quadra-600 hover:bg-fundo/70"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-base ${ativoTipo ? "text-white" : "text-tinta"}`}>
                              {cfg.rotulo}
                            </span>
                            <span
                              className={`text-[11px] font-semibold rounded px-1.5 py-0.5 border ${
                                ativoTipo
                                  ? "bg-bola-500 text-white border-bola-500"
                                  : "text-bola-500 bg-bola-50 border-bola-200"
                              }`}
                            >
                              {cfg.pontos === 2 ? "2 pts" : "1 pt"}
                            </span>
                          </div>
                          <p className={`text-xs mt-1 ${ativoTipo ? "text-white/80" : "text-suave"}`}>
                            {cfg.desc}
                          </p>
                        </div>

                        <div className={`mt-4 pt-3 border-t ${ativoTipo ? "border-white/20" : "border-linha"}`}>
                          <div className={`flex items-center justify-between text-xs mb-1 ${ativoTipo ? "text-white/80" : "text-suave"}`}>
                            <span>Volume:</span>
                            <strong className={ativoTipo ? "text-white" : "text-tinta"}>{info.total} arremesso(s)</strong>
                          </div>
                          <div className={`flex items-center justify-between text-xs mb-1 ${ativoTipo ? "text-white/80" : "text-suave"}`}>
                            <span>Gols:</span>
                            <strong className={ativoTipo ? "text-emerald-300" : "text-emerald-700"}>{info.gols}</strong>
                          </div>
                          <div className={`flex items-center justify-between text-xs mb-1 ${ativoTipo ? "text-white/80" : "text-suave"}`}>
                            <span>Aproveitamento:</span>
                            <strong className={ativoTipo ? "text-white" : "text-quadra-900"}>{pctAprov !== null ? `${pctAprov}%` : "-"}</strong>
                          </div>
                          <div className={`flex items-center justify-between text-xs ${ativoTipo ? "text-white/80" : "text-suave"}`}>
                            <span>Pontos gerados:</span>
                            <strong className={ativoTipo ? "text-bola-300" : "text-bola-500"}>{info.pontos} pts</strong>
                          </div>
                          <p className={`mt-2 text-[10px] text-center ${ativoTipo ? "text-bola-300 font-semibold" : "text-suave"}`}>
                            {ativoTipo ? "Filtrado (clique p/ limpar)" : "Clique p/ filtrar"}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* 3b. Mapa de Calor da Baliza (Regiões do Gol no Jogo) */}
              {statsBalizaJogo && statsBalizaJogo.total > 0 && (
                <section className="rounded-xl border border-linha bg-white p-5 shadow-sm">
                  <h3 className="font-titulo text-xl font-bold mb-1">Mapa de Regiões do Gol (Jogo)</h3>
                  <p className="text-xs text-suave mb-4">
                    Distribuição dos {statsBalizaJogo.total} arremessos com região da baliza registrada (Análise ao Vivo + Scout).
                  </p>
                  <BalizaInterativa modo="heatmap" estatisticas={statsBalizaJogo} />
                </section>
              )}

              {/* 4. Histórico de Finalizações de Jogo com Edição e Exclusão */}
              <section className="rounded-xl border border-linha bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-titulo text-xl font-bold">Histórico de Arremessos de Jogo</h3>
                  {editar && (
                    <Link
                      href={`/scout/registro?modo=jogo&equipe=${equipeId}${atletaId ? `&atleta=${atletaId}` : ""}`}
                      className="rounded-md bg-bola-500 px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                    >
                      + Registrar Arremesso
                    </Link>
                  )}
                </div>

                {finalizacoesFiltradas.length === 0 ? (
                  <div className="py-8 text-center text-sm text-suave">
                    <p>Nenhuma finalização de jogo registrada para esta seleção.</p>
                    {editar && (
                      <Link
                        href={`/scout/registro?modo=jogo&equipe=${equipeId}${atletaId ? `&atleta=${atletaId}` : ""}`}
                        className="mt-2 inline-block font-semibold text-bola-500 hover:underline text-xs"
                      >
                        Clique aqui para registrar a primeira finalização de jogo
                      </Link>
                    )}
                  </div>
                ) : (
                  <ul className="divide-y divide-linha text-sm">
                    {finalizacoesFiltradas.slice(0, 30).map((f) => {
                      const ehGol = f.resultado === "convertido";
                      const rotuloTipo = f.tipoFinalizacao ? ROTULO_TIPO_JOGO[f.tipoFinalizacao]?.rotulo : "-";
                      const rotuloSetor =
                        f.tipoFinalizacao === "6m"
                          ? "Tiro de 6m"
                          : f.zonaCampo
                          ? ROTULO_SETOR_JOGO[f.zonaCampo]
                          : "Setor não informado";

                      return (
                        <li key={f.id} className="py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-tinta">
                                {f.atletaNome ? `${f.atletaNumero ? `#${f.atletaNumero} ` : ""}${f.atletaNome}` : "Atleta não identificado"}
                                <span className="ml-2 text-xs font-normal text-suave">({equipeSelecionada?.nome})</span>
                              </p>
                              <p className="text-xs text-suave">
                                Tipo: <strong>{rotuloTipo}</strong> · Setor: <strong>{rotuloSetor}</strong>
                                {f.quadranteBaliza && (
                                  <span> · Região no gol: <strong>{ROTULO_QUADRANTE[f.quadranteBaliza]}</strong></span>
                                )}
                                {f.observacao && <span> · Obs: {f.observacao}</span>}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded px-2.5 py-1 text-xs font-bold ${
                                ehGol ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {ehGol ? "Convertido" : "Perdido"}
                            </span>
                          </div>

                          {editar && (
                            <details className="mt-2 text-xs">
                              <summary className="cursor-pointer text-suave hover:text-quadra-600 underline">
                                Editar ou excluir este arremesso
                              </summary>
                              <form
                                action={atualizarScoutBatida.bind(null, f.id)}
                                className="mt-2 rounded-lg border border-linha bg-fundo/60 p-3 grid gap-3 sm:grid-cols-2"
                              >
                                <input type="hidden" name="volta" value={urlAtual} />
                                <input type="hidden" name="origem" value="jogo" />

                                <div>
                                  <label className="block font-medium text-suave mb-1">Atleta</label>
                                  <select
                                    name="atleta_id"
                                    defaultValue={f.atletaAdversarioId ?? ""}
                                    className="w-full rounded-md border border-linha bg-white px-2.5 py-1.5 text-xs"
                                  >
                                    <option value="">Atleta não especificado</option>
                                    {atletas.map((a) => (
                                      <option key={a.id} value={a.id}>
                                        {a.numero ? `#${a.numero} ` : ""}{a.nome}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block font-medium text-suave mb-1">Tipo de Arremesso</label>
                                  <select
                                    name="tipo_finalizacao"
                                    defaultValue={f.tipoFinalizacao ?? "giro"}
                                    className="w-full rounded-md border border-linha bg-white px-2.5 py-1.5 text-xs"
                                  >
                                    {TIPOS_ARREMESSO_JOGO.map((tipo) => (
                                      <option key={tipo} value={tipo}>
                                        {ROTULO_TIPO_JOGO[tipo].rotulo} ({ROTULO_TIPO_JOGO[tipo].pontos === 2 ? "2 pts" : "1 pt"})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block font-medium text-suave mb-1">Setor de Origem na Quadra</label>
                                  <select
                                    name="zona_campo"
                                    defaultValue={f.zonaCampo ?? ""}
                                    className="w-full rounded-md border border-linha bg-white px-2.5 py-1.5 text-xs"
                                  >
                                    <option value="">Sem setor / Tiro de 6m</option>
                                    {SETORES_ORIGEM_JOGO.map((setor) => (
                                      <option key={setor} value={setor}>
                                        {ROTULO_SETOR_JOGO[setor]}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block font-medium text-suave mb-1">Região no Gol</label>
                                  <select
                                    name="quadrante_baliza"
                                    defaultValue={f.quadranteBaliza ?? ""}
                                    className="w-full rounded-md border border-linha bg-white px-2.5 py-1.5 text-xs"
                                  >
                                    <option value="">Não informado</option>
                                    {(Object.entries(ROTULO_QUADRANTE) as [QuadranteBaliza, string][]).map(([k, v]) => (
                                      <option key={k} value={k}>{v}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block font-medium text-suave mb-1">Resultado</label>
                                  <select
                                    name="resultado"
                                    defaultValue={f.resultado}
                                    className="w-full rounded-md border border-linha bg-white px-2.5 py-1.5 text-xs"
                                  >
                                    <option value="convertido">Convertido (Gol)</option>
                                    <option value="perdido">Perdido (Defesa / Fora)</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block font-medium text-suave mb-1">Nosso Goleiro</label>
                                  <select
                                    name="nosso_goleiro_id"
                                    defaultValue={f.nossoGoleiroId ?? ""}
                                    className="w-full rounded-md border border-linha bg-white px-2.5 py-1.5 text-xs"
                                  >
                                    <option value="">Não informado</option>
                                    {nossosGoleiros.map((g) => (
                                      <option key={g.id} value={g.id}>{g.nome}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="block font-medium text-suave mb-1">Observação</label>
                                  <input
                                    name="observacao"
                                    maxLength={300}
                                    defaultValue={f.observacao ?? ""}
                                    className="w-full rounded-md border border-linha bg-white px-2.5 py-1.5 text-xs"
                                  />
                                </div>

                                <div className="flex items-center gap-3 sm:col-span-2 pt-1">
                                  <button
                                    type="submit"
                                    className="rounded-md bg-bola-500 px-3 py-1.5 font-semibold text-white hover:opacity-90"
                                  >
                                    Salvar alterações
                                  </button>
                                  <button
                                    formAction={excluirScoutBatida.bind(null, f.id)}
                                    formNoValidate
                                    className="text-rose-600 hover:text-rose-700 underline text-xs ml-auto"
                                  >
                                    Excluir este arremesso
                                  </button>
                                </div>
                              </form>
                            </details>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </>
          )}

          {/* ======================================================== */}
          {/* ESCOPO B: SCOUT DE SHOOT-OUT                             */}
          {/* ======================================================== */}
          {ehModoShootout && statsBaliza && statsSaida && (
            <>
              {/* Cards de Métricas: Geral e Específico por Goleiro */}
              <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <CartaoIndicador rotulo="Batidas Analisadas" valor={String(totalSO)} />
                <CartaoIndicador rotulo="Aproveitamento Geral" valor={aproveitamentoSO} />
                <CartaoIndicador rotulo="Vs. Goleiro de Baliza" valor={aprovBaliza} />
                <CartaoIndicador rotulo="Vs. Goleiro de Saída" valor={aprovSaida} />
              </section>

              {/* Decisão Estratégica Rápida */}
              {totalSO > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-linha bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" role="img" aria-hidden="true">🎯</span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-suave">Decisão Estratégica Rápida</p>
                      <div className="text-sm text-tinta mt-0.5 font-medium">
                        {aprovBalizaPct !== null && aprovSaidaPct !== null ? (
                          aprovBalizaPct > aprovSaidaPct ? (
                            <span className="text-emerald-700 font-semibold">
                              Recomendação: <strong>Escalar Goleiro de Saída</strong> (O rival converte menos contra saída: {aprovSaidaPct}% vs {aprovBalizaPct}% na baliza).
                            </span>
                          ) : aprovSaidaPct > aprovBalizaPct ? (
                            <span className="text-quadra-600 font-semibold">
                              Recomendação: <strong>Manter Goleiro de Baliza</strong> (O rival converte menos na baliza: {aprovBalizaPct}% vs {aprovSaidaPct}% na saída).
                            </span>
                          ) : (
                            <span className="text-suave">
                              Aproveitamento idêntico ({aprovBalizaPct}%) em ambos os estilos. Alterne conforme a leitura do momento.
                            </span>
                          )
                        ) : statsBaliza.total > 0 ? (
                          <span className="text-suave">
                            Rival testado apenas contra goleiro de baliza ({aprovBaliza}). Teste goleiro de saída nos próximos lances.
                          </span>
                        ) : (
                          <span className="text-suave">
                            Rival testado apenas contra goleiro de saída ({aprovSaida}). Teste goleiro de baliza nos próximos lances.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-suave font-medium">
                    {statsBaliza.total} baliza · {statsSaida.total} saída
                  </div>
                </div>
              )}

              {/* Pilares do Shoot-out */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Pilar 1: Goleiro de Baliza */}
                <div className="space-y-4 rounded-xl border border-linha bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-linha pb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-quadra-600" />
                      <h2 className="font-titulo text-xl font-bold">Contra Goleiro de Baliza</h2>
                    </div>
                    <span className="text-xs font-semibold text-suave">
                      {statsBaliza.total} batida(s) · Aprov: {aprovBaliza}
                    </span>
                  </div>

                  {statsBaliza.total === 0 ? (
                    <p className="text-sm text-suave py-8 text-center">
                      Nenhuma batida registrada contra goleiro de baliza para este filtro.
                    </p>
                  ) : (
                    <>
                      <BalizaInterativa modo="heatmap" estatisticas={statsBaliza} />

                      <div className="rounded-lg bg-quadra-50 border border-quadra-100 p-3 text-xs space-y-1.5">
                        <p className="font-semibold text-quadra-900 flex items-center gap-1.5">
                          <Target className="h-4 w-4 text-bola-500" /> Dossiê Tático para a Baliza:
                        </p>
                        {statsBaliza.quadranteMaisFrequente && (
                          <p className="text-slate-700">
                            • <strong>Quadrante mais buscado:</strong> {ROTULO_QUADRANTE[statsBaliza.quadranteMaisFrequente]} ({statsBaliza.porQuadrante[statsBaliza.quadranteMaisFrequente].total} arremesso(s)).
                          </p>
                        )}
                        {statsBaliza.quadranteMaisPerigoso && (
                          <p className="text-slate-700">
                            • <strong>Quadrante de maior letalidade:</strong> {ROTULO_QUADRANTE[statsBaliza.quadranteMaisPerigoso]} ({statsBaliza.porQuadrante[statsBaliza.quadranteMaisPerigoso].gols} gol(s)).
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Pilar 2: Goleiro de Saída */}
                <div className="space-y-4 rounded-xl border border-linha bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-linha pb-3">
                    <div className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-bola-500" />
                      <h2 className="font-titulo text-xl font-bold">Contra Goleiro de Saída</h2>
                    </div>
                    <span className="text-xs font-semibold text-suave">
                      {statsSaida.total} batida(s) · Aprov: {aprovSaida}
                    </span>
                  </div>

                  {statsSaida.total === 0 ? (
                    <p className="text-sm text-suave py-8 text-center">
                      Nenhuma batida registrada contra goleiro de saída para este filtro.
                    </p>
                  ) : (
                    <>
                      <SeletorTecnicaSaida modo="visualizacao" estatisticas={statsSaida} />

                      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs space-y-1.5">
                        <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                          ⚡ Dossiê Tático para Goleiro Saindo:
                        </p>
                        {statsSaida.tecnicaPredominante && (
                          <p className="text-slate-800">
                            • <strong>Forma de batida preferida:</strong> {ROTULO_TECNICA_SAIDA[statsSaida.tecnicaPredominante].rotulo} ({statsSaida.porTecnica[statsSaida.tecnicaPredominante].total} ocorrência(s)).
                          </p>
                        )}
                        {statsSaida.tecnicaMaisLetal && (
                          <p className="text-slate-800">
                            • <strong>Golpe mais eficiente:</strong> {ROTULO_TECNICA_SAIDA[statsSaida.tecnicaMaisLetal].rotulo} ({statsSaida.porTecnica[statsSaida.tecnicaMaisLetal].gols} gol(s)).
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Histórico do Shoot-out */}
              <section className="rounded-xl border border-linha bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-titulo text-xl font-bold">Histórico de Batidas de Shoot-out</h3>
                  {editar && (
                    <Link
                      href={`/scout/registro?modo=shootout&equipe=${equipeId}${atletaId ? `&atleta=${atletaId}` : ""}`}
                      className="rounded-md bg-quadra-900 px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                    >
                      + Registrar Shoot-out
                    </Link>
                  )}
                </div>

                {finalizacoes.length === 0 ? (
                  <p className="text-sm text-suave">Nenhuma batida registrada.</p>
                ) : (
                  <ul className="divide-y divide-linha text-sm">
                    {finalizacoes.slice(0, 20).map((f) => {
                      const ehGol = f.resultado === "convertido";
                      return (
                        <li key={f.id} className="py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-tinta">
                                {f.atletaNome ? `${f.atletaNumero ? `#${f.atletaNumero} ` : ""}${f.atletaNome}` : "Atleta não identificado"}
                                <span className="ml-2 text-xs font-normal text-suave">({equipeSelecionada?.nome})</span>
                              </p>
                              <p className="text-xs text-suave">
                                {f.estiloGoleiro === "baliza" ? (
                                  <>Goleiro de Baliza · Região: <strong>{f.quadranteBaliza ? ROTULO_QUADRANTE[f.quadranteBaliza] : "-"}</strong></>
                                ) : (
                                  <>Goleiro de Saída · Técnica: <strong>{f.tecnicaSaida ? ROTULO_TECNICA_SAIDA[f.tecnicaSaida].rotulo : "-"}</strong></>
                                )}
                                {f.observacao && <span> · Obs: {f.observacao}</span>}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded px-2.5 py-1 text-xs font-bold ${
                                ehGol ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {ehGol ? "Convertido" : "Perdido"}
                            </span>
                          </div>

                          {editar && (
                            <details className="mt-2 text-xs">
                              <summary className="cursor-pointer text-suave hover:text-quadra-600 underline">
                                Editar ou excluir esta batida
                              </summary>
                              <form
                                action={atualizarScoutBatida.bind(null, f.id)}
                                className="mt-2 rounded-lg border border-linha bg-fundo/60 p-3 grid gap-3 sm:grid-cols-2"
                              >
                                <input type="hidden" name="volta" value={urlAtual} />
                                <input type="hidden" name="origem" value="shootout" />

                                <div>
                                  <label className="block font-medium text-suave mb-1">Atleta / Cobrador</label>
                                  <select
                                    name="atleta_id"
                                    defaultValue={f.atletaAdversarioId ?? ""}
                                    className="w-full rounded-md border border-linha bg-white px-2.5 py-1.5 text-xs"
                                  >
                                    <option value="">Atleta não especificado</option>
                                    {atletas.map((a) => (
                                      <option key={a.id} value={a.id}>
                                        {a.numero ? `#${a.numero} ` : ""}{a.nome}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block font-medium text-suave mb-1">Estilo do Goleiro</label>
                                  <select
                                    name="estilo_goleiro"
                                    defaultValue={f.estiloGoleiro ?? "baliza"}
                                    className="w-full rounded-md border border-linha bg-white px-2.5 py-1.5 text-xs"
                                  >
                                    <option value="baliza">Goleiro de Baliza</option>
                                    <option value="saida">Goleiro de Saída</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block font-medium text-suave mb-1">Região no Gol (se baliza)</label>
                                  <select
                                    name="quadrante_baliza"
                                    defaultValue={f.quadranteBaliza ?? ""}
                                    className="w-full rounded-md border border-linha bg-white px-2.5 py-1.5 text-xs"
                                  >
                                    <option value="">Nenhum / Não aplicável</option>
                                    {(Object.entries(ROTULO_QUADRANTE) as [QuadranteBaliza, string][]).map(([k, v]) => (
                                      <option key={k} value={k}>{v}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block font-medium text-suave mb-1">Técnica (se saída)</label>
                                  <select
                                    name="tecnica_saida"
                                    defaultValue={f.tecnicaSaida ?? ""}
                                    className="w-full rounded-md border border-linha bg-white px-2.5 py-1.5 text-xs"
                                  >
                                    <option value="">Nenhum / Não aplicável</option>
                                    {(Object.entries(ROTULO_TECNICA_SAIDA) as [TecnicaSaida, { rotulo: string }][]).map(([k, info]) => (
                                      <option key={k} value={k}>{info.rotulo}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block font-medium text-suave mb-1">Resultado</label>
                                  <select
                                    name="resultado"
                                    defaultValue={f.resultado}
                                    className="w-full rounded-md border border-linha bg-white px-2.5 py-1.5 text-xs"
                                  >
                                    <option value="convertido">Convertido (Gol)</option>
                                    <option value="perdido">Perdido (Defesa / Fora)</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block font-medium text-suave mb-1">Nosso Goleiro</label>
                                  <select
                                    name="nosso_goleiro_id"
                                    defaultValue={f.nossoGoleiroId ?? ""}
                                    className="w-full rounded-md border border-linha bg-white px-2.5 py-1.5 text-xs"
                                  >
                                    <option value="">Não informado</option>
                                    {nossosGoleiros.map((g) => (
                                      <option key={g.id} value={g.id}>{g.nome}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="block font-medium text-suave mb-1">Observação</label>
                                  <input
                                    name="observacao"
                                    maxLength={300}
                                    defaultValue={f.observacao ?? ""}
                                    className="w-full rounded-md border border-linha bg-white px-2.5 py-1.5 text-xs"
                                  />
                                </div>

                                <div className="flex items-center gap-3 sm:col-span-2 pt-1">
                                  <button
                                    type="submit"
                                    className="rounded-md bg-bola-500 px-3 py-1.5 font-semibold text-white hover:opacity-90"
                                  >
                                    Salvar alterações
                                  </button>
                                  <button
                                    formAction={excluirScoutBatida.bind(null, f.id)}
                                    formNoValidate
                                    className="text-rose-600 hover:text-rose-700 underline text-xs ml-auto"
                                  >
                                    Excluir esta batida
                                  </button>
                                </div>
                              </form>
                            </details>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
