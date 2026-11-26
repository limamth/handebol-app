"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function exigirEdicao(papel: any) {
  if (!podeEditar(papel, "analise_jogo")) {
    redirect("/analise-jogo/equipes?erro=" + encodeURIComponent("Sem permissão para gerenciar equipes de análise."));
  }
}

function revalidar() {
  revalidatePath("/analise-jogo/equipes");
  revalidatePath("/analise-jogo");
  revalidatePath("/scout");
  revalidatePath("/scout/registro");
}

export async function criarEquipeAnalise(formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  exigirEdicao(perfil.papel);

  const nome = texto(formData, "nome");
  const categoria = texto(formData, "categoria") || null;
  const tipo = texto(formData, "tipo") === "terceira" ? "terceira" : "nossa";

  if (!nome) {
    redirect("/analise-jogo/equipes?erro=" + encodeURIComponent("Informe o nome da equipe."));
  }

  // Cria também em equipes_adversarias para interligar com o Scout
  const { data: eqAdv } = await supabase
    .from("equipes_adversarias")
    .insert({ clube_id: perfil.clube_id, nome, categoria })
    .select("id")
    .single();

  const { data, error } = await supabase
    .from("equipes_analise")
    .insert({
      clube_id: perfil.clube_id,
      nome,
      categoria,
      tipo,
      equipe_adversaria_id: eqAdv?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect("/analise-jogo/equipes?erro=" + encodeURIComponent("Erro ao criar equipe: " + (error?.message ?? "")));
  }

  revalidar();
  redirect(`/analise-jogo/equipes?equipe=${data.id}&aviso=` + encodeURIComponent(`Equipe "${nome}" criada e interligada ao Scout!`));
}

export async function atualizarEquipeAnalise(equipeId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  exigirEdicao(perfil.papel);

  const nome = texto(formData, "nome");
  const categoria = texto(formData, "categoria") || null;
  const tipo = texto(formData, "tipo") === "terceira" ? "terceira" : "nossa";

  if (!nome) {
    redirect(`/analise-jogo/equipes?equipe=${equipeId}&erro=` + encodeURIComponent("Informe o nome."));
  }

  const { data: eq } = await supabase
    .from("equipes_analise")
    .update({ nome, categoria, tipo })
    .eq("id", equipeId)
    .eq("clube_id", perfil.clube_id)
    .select("equipe_adversaria_id")
    .single();

  if (eq?.equipe_adversaria_id) {
    await supabase
      .from("equipes_adversarias")
      .update({ nome, categoria })
      .eq("id", eq.equipe_adversaria_id)
      .eq("clube_id", perfil.clube_id);
  }

  revalidar();
  redirect(`/analise-jogo/equipes?equipe=${equipeId}&aviso=` + encodeURIComponent("Equipe atualizada!"));
}

export async function excluirEquipeAnalise(equipeId: string) {
  const { supabase, perfil } = await obterPerfil();
  exigirEdicao(perfil.papel);

  await supabase
    .from("equipes_analise")
    .delete()
    .eq("id", equipeId)
    .eq("clube_id", perfil.clube_id);

  revalidar();
  redirect("/analise-jogo/equipes?aviso=" + encodeURIComponent("Equipe excluída."));
}

async function garantirEquipeAdversariaVinculada(supabase: any, clubeId: string, equipeAnaliseId: string): Promise<string | null> {
  const { data: eq } = await supabase
    .from("equipes_analise")
    .select("id, nome, categoria, equipe_adversaria_id")
    .eq("id", equipeAnaliseId)
    .eq("clube_id", clubeId)
    .single();

  if (!eq) return null;
  if (eq.equipe_adversaria_id) return eq.equipe_adversaria_id;

  const { data: novaAdv } = await supabase
    .from("equipes_adversarias")
    .insert({ clube_id: clubeId, nome: eq.nome, categoria: eq.categoria })
    .select("id")
    .single();

  if (novaAdv?.id) {
    await supabase
      .from("equipes_analise")
      .update({ equipe_adversaria_id: novaAdv.id })
      .eq("id", eq.id);
    return novaAdv.id;
  }
  return null;
}

export async function adicionarAtletaEquipeAnalise(equipeId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  exigirEdicao(perfil.papel);

  const nome = texto(formData, "nome");
  const numeroStr = texto(formData, "numero");
  const numero = numeroStr ? Number(numeroStr) : null;
  const posicao = texto(formData, "posicao") || null;

  if (!nome) {
    redirect(`/analise-jogo/equipes?equipe=${equipeId}&erro=` + encodeURIComponent("Informe o nome do atleta."));
  }

  const eqAdvId = await garantirEquipeAdversariaVinculada(supabase, perfil.clube_id, equipeId);
  let atletaAdvId: string | null = null;
  if (eqAdvId) {
    const { data: atlAdv } = await supabase
      .from("atletas_adversarios")
      .insert({
        clube_id: perfil.clube_id,
        equipe_adversaria_id: eqAdvId,
        nome,
        numero,
        posicao,
      })
      .select("id")
      .single();
    atletaAdvId = atlAdv?.id ?? null;
  }

  const { error } = await supabase.from("atletas_equipe_analise").insert({
    clube_id: perfil.clube_id,
    equipe_analise_id: equipeId,
    nome,
    numero,
    posicao,
    atleta_adversario_id: atletaAdvId,
  });

  if (error) {
    redirect(`/analise-jogo/equipes?equipe=${equipeId}&erro=` + encodeURIComponent("Erro ao adicionar atleta."));
  }

  revalidar();
  redirect(`/analise-jogo/equipes?equipe=${equipeId}&aviso=` + encodeURIComponent(`Atleta "${nome}" adicionado!`));
}

export async function adicionarAtletasEquipeAnaliseEmLote(equipeId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  exigirEdicao(perfil.papel);

  const listaTexto = texto(formData, "lista");
  if (!listaTexto) {
    redirect(`/analise-jogo/equipes?equipe=${equipeId}&erro=` + encodeURIComponent("Digite ao menos um atleta."));
  }

  const eqAdvId = await garantirEquipeAdversariaVinculada(supabase, perfil.clube_id, equipeId);

  const linhas = listaTexto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const registros = [];
  for (const linha of linhas) {
    const match = linha.match(/^#?(\d+)\s*[-–:\s]\s*(.+)$/);
    const numero = match ? Number(match[1]) : null;
    const nome = match ? match[2].trim() : linha;

    let atletaAdvId: string | null = null;
    if (eqAdvId) {
      const { data: atlAdv } = await supabase
        .from("atletas_adversarios")
        .insert({
          clube_id: perfil.clube_id,
          equipe_adversaria_id: eqAdvId,
          numero,
          nome,
        })
        .select("id")
        .single();
      atletaAdvId = atlAdv?.id ?? null;
    }

    registros.push({
      clube_id: perfil.clube_id,
      equipe_analise_id: equipeId,
      numero,
      nome,
      atleta_adversario_id: atletaAdvId,
    });
  }

  const { error } = await supabase.from("atletas_equipe_analise").insert(registros);

  if (error) {
    redirect(`/analise-jogo/equipes?equipe=${equipeId}&erro=` + encodeURIComponent("Erro ao cadastrar lista."));
  }

  revalidar();
  redirect(
    `/analise-jogo/equipes?equipe=${equipeId}&aviso=` +
      encodeURIComponent(`${registros.length} atleta(s) adicionado(s) ao elenco!`)
  );
}

export async function atualizarAtletaEquipeAnalise(equipeId: string, atletaId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  exigirEdicao(perfil.papel);

  const nome = texto(formData, "nome");
  const numeroStr = texto(formData, "numero");
  const numero = numeroStr ? Number(numeroStr) : null;
  const posicao = texto(formData, "posicao") || null;

  if (!nome) {
    redirect(`/analise-jogo/equipes?equipe=${equipeId}&erro=` + encodeURIComponent("Nome obrigatório."));
  }

  const { data: atl } = await supabase
    .from("atletas_equipe_analise")
    .update({ nome, numero, posicao })
    .eq("id", atletaId)
    .eq("clube_id", perfil.clube_id)
    .select("atleta_adversario_id")
    .single();

  if (atl?.atleta_adversario_id) {
    await supabase
      .from("atletas_adversarios")
      .update({ nome, numero, posicao })
      .eq("id", atl.atleta_adversario_id)
      .eq("clube_id", perfil.clube_id);
  }

  revalidar();
  redirect(`/analise-jogo/equipes?equipe=${equipeId}&aviso=` + encodeURIComponent("Atleta atualizado!"));
}

export async function excluirAtletaEquipeAnalise(equipeId: string, atletaId: string) {
  const { supabase, perfil } = await obterPerfil();
  exigirEdicao(perfil.papel);

  const { data: atl } = await supabase
    .from("atletas_equipe_analise")
    .delete()
    .eq("id", atletaId)
    .eq("clube_id", perfil.clube_id)
    .select("atleta_adversario_id")
    .maybeSingle();

  if (atl?.atleta_adversario_id) {
    await supabase
      .from("atletas_adversarios")
      .delete()
      .eq("id", atl.atleta_adversario_id)
      .eq("clube_id", perfil.clube_id);
  }

  revalidar();
  redirect(`/analise-jogo/equipes?equipe=${equipeId}&aviso=` + encodeURIComponent("Atleta removido."));
}

export async function importarEquipesDoScout() {
  const { supabase, perfil } = await obterPerfil();
  exigirEdicao(perfil.papel);

  const { data: eqAdvs } = await supabase
    .from("equipes_adversarias")
    .select("id, nome, categoria, atletas_adversarios(id, nome, numero, posicao)")
    .eq("clube_id", perfil.clube_id);

  const { data: eqAnalises } = await supabase
    .from("equipes_analise")
    .select("id, equipe_adversaria_id")
    .eq("clube_id", perfil.clube_id);

  const jaVinculadas = new Set(
    (eqAnalises ?? []).map((e: any) => e.equipe_adversaria_id).filter(Boolean)
  );

  let importadas = 0;
  for (const adv of eqAdvs ?? []) {
    if (jaVinculadas.has(adv.id)) continue;

    const { data: novaEq } = await supabase
      .from("equipes_analise")
      .insert({
        clube_id: perfil.clube_id,
        nome: adv.nome,
        categoria: adv.categoria,
        tipo: "terceira",
        equipe_adversaria_id: adv.id,
      })
      .select("id")
      .single();

    if (novaEq?.id && adv.atletas_adversarios?.length) {
      await supabase.from("atletas_equipe_analise").insert(
        adv.atletas_adversarios.map((a: any) => ({
          clube_id: perfil.clube_id,
          equipe_analise_id: novaEq.id,
          nome: a.nome,
          numero: a.numero,
          posicao: a.posicao,
          atleta_adversario_id: a.id,
        }))
      );
    }
    importadas++;
  }

  revalidar();
  redirect(
    `/analise-jogo/equipes?aviso=` +
      encodeURIComponent(
        importadas > 0
          ? `${importadas} equipe(s) importada(s) do Scout com sucesso!`
          : "Todas as equipes do Scout já estão sincronizadas."
      )
  );
}
