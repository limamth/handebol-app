import { notFound, redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { exigirModuloAtivo } from "@/lib/configuracoes";
import { podeEditar, podeVer } from "@/lib/permissions";
import { Aviso } from "@/components/ui/Aviso";
import { PainelEstatisticasPartida } from "@/components/analise-jogo/PainelEstatisticasPartida";
import type { AcaoPartida, PartidaAnalise } from "@/lib/analise-jogo";

export const metadata = {
  title: "Estatísticas da Partida | Handebol Hub",
};

export default async function PaginaEstatisticasPartida({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { aviso?: string; erro?: string };
}) {
  await exigirModuloAtivo("analise_jogo");
  const { supabase, perfil } = await obterPerfil();

  if (!podeVer(perfil.papel, "analise_jogo")) {
    redirect("/dashboard");
  }

  const { data: partida } = await supabase
    .from("partidas_analise")
    .select("*, equipas(id, nome, categoria)")
    .eq("id", params.id)
    .eq("clube_id", perfil.clube_id)
    .single();

  if (!partida) notFound();

  const { data: acoes } = await supabase
    .from("acoes_partida")
    .select("*")
    .eq("partida_id", params.id)
    .eq("clube_id", perfil.clube_id)
    .order("criado_em", { ascending: true });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Aviso
        key={Date.now()}
        mensagem={searchParams.erro ?? searchParams.aviso}
        tipo={searchParams.erro ? "erro" : "ok"}
      />

      <PainelEstatisticasPartida
        partida={partida as PartidaAnalise}
        acoes={(acoes ?? []) as AcaoPartida[]}
        podeEditar={podeEditar(perfil.papel, "analise_jogo")}
      />
    </div>
  );
}
