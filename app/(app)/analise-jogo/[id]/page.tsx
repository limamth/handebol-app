import { notFound, redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { exigirModuloAtivo } from "@/lib/configuracoes";
import { podeEditar } from "@/lib/permissions";
import { PainelAoVivo, type AtletaSimples } from "@/components/analise-jogo/PainelAoVivo";
import type { AcaoPartida, PartidaAnalise } from "@/lib/analise-jogo";

export const metadata = {
  title: "Registro ao Vivo | Handebol Hub",
};

export default async function PaginaRegistroAoVivo({ params }: { params: { id: string } }) {
  await exigirModuloAtivo("analise_jogo");
  const { supabase, perfil } = await obterPerfil();

  if (!podeEditar(perfil.papel, "analise_jogo")) {
    redirect(`/analise-jogo/${params.id}/estatisticas`);
  }

  const { data: partida } = await supabase
    .from("partidas_analise")
    .select("*, equipas(id, nome, categoria)")
    .eq("id", params.id)
    .eq("clube_id", perfil.clube_id)
    .single();

  if (!partida) notFound();

  const [{ data: acoes }, resA, resB] = await Promise.all([
    supabase
      .from("acoes_partida")
      .select("*")
      .eq("partida_id", params.id)
      .eq("clube_id", perfil.clube_id)
      .order("criado_em", { ascending: true }),
    partida.equipe_a_id
      ? supabase
          .from("atletas_equipe_analise")
          .select("id, nome, numero")
          .eq("equipe_analise_id", partida.equipe_a_id)
          .order("numero", { ascending: true })
      : partida.equipa_id
      ? supabase
          .from("membros_equipa")
          .select("numero_camisa, usuarios(id, nome)")
          .eq("equipa_id", partida.equipa_id)
      : Promise.resolve({ data: [] }),
    partida.equipe_b_id
      ? supabase
          .from("atletas_equipe_analise")
          .select("id, nome, numero")
          .eq("equipe_analise_id", partida.equipe_b_id)
          .order("numero", { ascending: true })
      : partida.equipe_adversaria_id
      ? supabase
          .from("atletas_adversarios")
          .select("id, nome, numero")
          .eq("equipe_adversaria_id", partida.equipe_adversaria_id)
          .order("numero", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const atletasNos: AtletaSimples[] = ((resA.data ?? []) as any[])
    .map((m) =>
      m.usuarios
        ? { id: m.usuarios.id, nome: m.usuarios.nome, numero: m.numero_camisa }
        : { id: null, nome: m.nome, numero: m.numero }
    )
    .sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999) || a.nome.localeCompare(b.nome));

  if (atletasNos.length === 0) {
    atletasNos.push({ id: null, nome: "Base", numero: 1 });
  }

  const atletasAdv: AtletaSimples[] = ((resB.data ?? []) as any[])
    .map((a) => ({
      id: null,
      nome: a.nome,
      numero: a.numero,
    }))
    .sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999) || a.nome.localeCompare(b.nome));

  if (atletasAdv.length === 0) {
    atletasAdv.push({ id: null, nome: "Base", numero: 1 });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PainelAoVivo
        partidaInicial={partida as PartidaAnalise}
        acoesIniciais={(acoes ?? []) as AcaoPartida[]}
        atletasNos={atletasNos}
        atletasAdv={atletasAdv}
      />
    </div>
  );
}
