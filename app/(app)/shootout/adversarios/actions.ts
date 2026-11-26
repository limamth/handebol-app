"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import {
  type EstiloGoleiro,
  type QuadranteBaliza,
  type TecnicaSaida,
  type TipoArremessoJogo,
  type SetorOrigemJogo,
  TIPOS_ARREMESSO_JOGO,
  SETORES_ORIGEM_JOGO,
} from "@/lib/scouting";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const uuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

async function exigirEdicao() {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "scout") && !podeEditar(perfil.papel, "shootout")) {
    redirect("/scout?erro=" + encodeURIComponent("Você não tem permissão para gerenciar scout de adversários."));
  }
  return { supabase, perfil };
}

export async function criarEquipeAdversaria(formData: FormData) {
  const { supabase, perfil } = await exigirEdicao();
  const nome = texto(formData, "nome");
  const categoria = texto(formData, "categoria") || null;
  const volta = texto(formData, "volta") || "/scout/registro";

  if (!nome) redirect(`${volta}?erro=` + encodeURIComponent("Informe o nome da equipe adversária."));

  const { data, error } = await supabase.from("equipes_adversarias").insert({
    clube_id: perfil.clube_id,
    nome,
    categoria,
  }).select("id").single();

  if (error) redirect(`${volta}?erro=` + encodeURIComponent("Não foi possível cadastrar a equipe adversária."));

  // Sincroniza também com equipes_analise para aparecer na Análise ao Vivo
  await supabase.from("equipes_analise").insert({
    clube_id: perfil.clube_id,
    nome,
    categoria,
    tipo: "terceira",
    equipe_adversaria_id: data.id,
  });

  revalidatePath("/scout");
  revalidatePath("/analise-jogo");
  revalidatePath("/analise-jogo/equipes");
  revalidatePath("/shootout/adversarios");
  const sep = volta.includes("?") ? "&" : "?";
  redirect(`${volta}${sep}equipe=${data.id}&aviso=` + encodeURIComponent(`Equipe "${nome}" cadastrada com sucesso.`));
}

export async function criarAtletaAdversario(formData: FormData) {
  const { supabase, perfil } = await exigirEdicao();
  const equipeId = texto(formData, "equipe_id");
  const nome = texto(formData, "nome");
  const numero = Number(texto(formData, "numero")) || null;
  const posicao = texto(formData, "posicao") || null;
  const mao = texto(formData, "mao") || null;
  const observacoes = texto(formData, "observacoes") || null;
  const volta = texto(formData, "volta") || "/scout/registro";

  const sep = volta.includes("?") ? "&" : "?";

  if (!uuid(equipeId)) redirect(`${volta}?erro=` + encodeURIComponent("Selecione uma equipe válida."));
  if (!nome) redirect(`${volta}${sep}equipe=${equipeId}&erro=` + encodeURIComponent("Informe o nome do atleta adversário."));

  const { data, error } = await supabase.from("atletas_adversarios").insert({
    clube_id: perfil.clube_id,
    equipe_adversaria_id: equipeId,
    nome,
    numero,
    posicao,
    mao: mao === "destro" || mao === "canhoto" ? mao : null,
    observacoes,
  }).select("id").single();

  if (error) redirect(`${volta}${sep}equipe=${equipeId}&erro=` + encodeURIComponent("Não foi possível cadastrar o atleta adversário."));

  // Sincroniza também com atletas_equipe_analise se a equipe estiver vinculada
  const { data: eqAnalise } = await supabase
    .from("equipes_analise")
    .select("id")
    .eq("equipe_adversaria_id", equipeId)
    .eq("clube_id", perfil.clube_id)
    .maybeSingle();

  if (eqAnalise?.id) {
    await supabase.from("atletas_equipe_analise").insert({
      clube_id: perfil.clube_id,
      equipe_analise_id: eqAnalise.id,
      nome,
      numero,
      posicao,
      atleta_adversario_id: data.id,
    });
  }

  revalidatePath("/scout");
  revalidatePath("/analise-jogo");
  revalidatePath("/analise-jogo/equipes");
  revalidatePath("/shootout/adversarios");
  redirect(`${volta}${sep}equipe=${equipeId}&atleta=${data.id}&aviso=` + encodeURIComponent(`Atleta "${nome}" cadastrado com sucesso.`));
}

export async function registrarScoutBatida(dados: {
  equipeId: string;
  atletaId?: string | null;
  origem?: "shootout" | "jogo";
  estiloGoleiro?: EstiloGoleiro | null;
  quadranteBaliza?: QuadranteBaliza | null;
  tecnicaSaida?: TecnicaSaida | null;
  tipoFinalizacao?: TipoArremessoJogo | null;
  zonaCampo?: SetorOrigemJogo | null;
  resultado: "convertido" | "perdido";
  nossoGoleiroId?: string | null;
  observacao?: string | null;
}) {
  const { supabase, perfil } = await exigirEdicao();

  if (!uuid(dados.equipeId)) throw new Error("Selecione a equipe adversária.");

  const origem = dados.origem === "jogo" ? "jogo" : "shootout";

  if (origem === "jogo") {
    if (!dados.tipoFinalizacao || !TIPOS_ARREMESSO_JOGO.includes(dados.tipoFinalizacao)) {
      throw new Error("Selecione um tipo de arremesso válido (Giro, Aérea, Especialista, 1pt ou 6m).");
    }
    // 6m não possui setor de origem
    const zonaFinal =
      dados.tipoFinalizacao === "6m"
        ? null
        : dados.zonaCampo && SETORES_ORIGEM_JOGO.includes(dados.zonaCampo)
        ? dados.zonaCampo
        : null;

    const { error } = await supabase.from("scout_finalizacoes_adversario").insert({
      clube_id: perfil.clube_id,
      equipe_adversaria_id: dados.equipeId,
      atleta_adversario_id: dados.atletaId && uuid(dados.atletaId) ? dados.atletaId : null,
      origem: "jogo",
      tipo_finalizacao: dados.tipoFinalizacao,
      zona_campo: zonaFinal,
      quadrante_baliza: dados.quadranteBaliza || null,
      resultado: dados.resultado,
      nosso_goleiro_id: dados.nossoGoleiroId && uuid(dados.nossoGoleiroId) ? dados.nossoGoleiroId : null,
      observacao: dados.observacao?.slice(0, 300) || null,
      registrado_por: perfil.id,
    });

    if (error) throw new Error(error.message || "Erro ao registrar finalização de jogo.");
  } else {
    // Shoot-out
    if (dados.estiloGoleiro === "baliza" && !dados.quadranteBaliza) {
      throw new Error("Selecione o quadrante da baliza onde foi a finalização.");
    }
    if (dados.estiloGoleiro === "saida" && !dados.tecnicaSaida) {
      throw new Error("Selecione a técnica utilizada contra o goleiro saindo.");
    }

    const { error } = await supabase.from("scout_finalizacoes_adversario").insert({
      clube_id: perfil.clube_id,
      equipe_adversaria_id: dados.equipeId,
      atleta_adversario_id: dados.atletaId && uuid(dados.atletaId) ? dados.atletaId : null,
      origem: "shootout",
      estilo_goleiro: dados.estiloGoleiro || "baliza",
      quadrante_baliza: dados.estiloGoleiro === "baliza" ? dados.quadranteBaliza : null,
      tecnica_saida: dados.estiloGoleiro === "saida" ? dados.tecnicaSaida : null,
      resultado: dados.resultado,
      nosso_goleiro_id: dados.nossoGoleiroId && uuid(dados.nossoGoleiroId) ? dados.nossoGoleiroId : null,
      observacao: dados.observacao?.slice(0, 300) || null,
      registrado_por: perfil.id,
    });

    if (error) throw new Error(error.message || "Erro ao registrar batida de scout.");
  }

  revalidatePath("/scout");
  revalidatePath("/shootout/adversarios");
  return { ok: true };
}

export async function excluirScoutBatida(id: string, formData: FormData) {
  const { supabase, perfil } = await exigirEdicao();
  const volta = texto(formData, "volta") || "/scout";
  const urlBase = volta.split("?")[0];
  const params = new URLSearchParams(volta.split("?")[1] || "");

  if (!uuid(id)) {
    params.set("erro", "ID de batida inválido.");
    redirect(`${urlBase}?${params}`);
  }

  const { error } = await supabase
    .from("scout_finalizacoes_adversario")
    .delete()
    .eq("id", id)
    .eq("clube_id", perfil.clube_id);

  if (error) {
    params.set("erro", "Não foi possível excluir o lance.");
    redirect(`${urlBase}?${params}`);
  }

  revalidatePath("/scout");
  revalidatePath("/shootout/adversarios");
  params.set("aviso", "Lance excluído com sucesso.");
  redirect(`${urlBase}?${params}`);
}

export async function atualizarScoutBatida(id: string, formData: FormData) {
  const { supabase, perfil } = await exigirEdicao();
  const volta = texto(formData, "volta") || "/scout";
  const urlBase = volta.split("?")[0];
  const params = new URLSearchParams(volta.split("?")[1] || "");

  if (!uuid(id)) {
    params.set("erro", "ID de batida inválido.");
    redirect(`${urlBase}?${params}`);
  }

  const origem = texto(formData, "origem") || "shootout";
  const atletaId = texto(formData, "atleta_id");
  const resultado = texto(formData, "resultado");
  const nossoGoleiroId = texto(formData, "nosso_goleiro_id");
  const observacao = texto(formData, "observacao");
  const quadranteBaliza = texto(formData, "quadrante_baliza") || null;

  if (resultado !== "convertido" && resultado !== "perdido") {
    params.set("erro", "Resultado inválido.");
    redirect(`${urlBase}?${params}`);
  }

  const updatePayload: Record<string, any> = {
    atleta_adversario_id: atletaId && uuid(atletaId) ? atletaId : null,
    resultado: resultado as "convertido" | "perdido",
    nosso_goleiro_id: nossoGoleiroId && uuid(nossoGoleiroId) ? nossoGoleiroId : null,
    observacao: observacao?.slice(0, 300) || null,
    quadrante_baliza: quadranteBaliza,
  };

  if (origem === "jogo") {
    const tipoFinalizacao = texto(formData, "tipo_finalizacao") as TipoArremessoJogo;
    const zonaCampo = texto(formData, "zona_campo") as SetorOrigemJogo;

    if (!TIPOS_ARREMESSO_JOGO.includes(tipoFinalizacao)) {
      params.set("erro", "Tipo de arremesso inválido.");
      redirect(`${urlBase}?${params}`);
    }

    updatePayload.tipo_finalizacao = tipoFinalizacao;
    // Se for 6m, setor é sempre nulo
    updatePayload.zona_campo =
      tipoFinalizacao === "6m"
        ? null
        : SETORES_ORIGEM_JOGO.includes(zonaCampo)
        ? zonaCampo
        : null;
    updatePayload.estilo_goleiro = null;
    updatePayload.tecnica_saida = null;
  } else {
    // Shoot-out
    const estiloGoleiro = texto(formData, "estilo_goleiro");
    const tecnicaSaida = texto(formData, "tecnica_saida");

    if (estiloGoleiro !== "baliza" && estiloGoleiro !== "saida") {
      params.set("erro", "Estilo de goleiro inválido.");
      redirect(`${urlBase}?${params}`);
    }

    updatePayload.estilo_goleiro = estiloGoleiro;
    updatePayload.quadrante_baliza = estiloGoleiro === "baliza" ? quadranteBaliza : null;
    updatePayload.tecnica_saida = estiloGoleiro === "saida" ? tecnicaSaida || null : null;
  }

  const { error } = await supabase
    .from("scout_finalizacoes_adversario")
    .update(updatePayload)
    .eq("id", id)
    .eq("clube_id", perfil.clube_id);

  if (error) {
    params.set("erro", "Não foi possível atualizar o lance: " + error.message);
    redirect(`${urlBase}?${params}`);
  }

  revalidatePath("/scout");
  revalidatePath("/shootout/adversarios");
  params.set("aviso", "Lance atualizado com sucesso.");
  redirect(`${urlBase}?${params}`);
}
