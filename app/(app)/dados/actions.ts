"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { formatarDataExcel, MAPA_COLUNAS_EXCEL, type CategoriaCampo, type TipoCampo } from "@/lib/dados-atletas";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function normalizarChave(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Salva os dados cadastrais de um atleta ou oficial.
 * Atletas só podem salvar os próprios dados.
 */
export async function salvarDadosAtleta(atletaId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();

  const ehAtleta = perfil.papel === "atleta";
  if (ehAtleta && perfil.id !== atletaId) {
    redirect(`/dados?erro=${encodeURIComponent("Você só tem permissão para editar os seus próprios dados.")}`);
  }

  const podeGerir = ["gestor", "comissao_tecnica"].includes(perfil.papel);
  if (!ehAtleta && !podeGerir) {
    redirect(`/dados?erro=${encodeURIComponent("Permissão insuficiente para alterar dados cadastrais.")}`);
  }

  // Carrega campos existentes para saber o que ler do formData
  const { data: camposDef } = await supabase
    .from("campos_cadastro_atleta")
    .select("chave, permite_foto, tipo")
    .eq("clube_id", perfil.clube_id);

  // Lê o registro cadastral anterior para não perder fotos que não foram reenviadas
  const { data: existente } = await supabase
    .from("dados_cadastrais_atleta")
    .select("valores, fotos, checado")
    .eq("clube_id", perfil.clube_id)
    .eq("atleta_id", atletaId)
    .maybeSingle();

  const valoresAnteriores = (existente?.valores ?? {}) as Record<string, string>;
  const fotosAnteriores = (existente?.fotos ?? {}) as Record<string, string>;

  const novosValores: Record<string, string> = { ...valoresAnteriores };
  const novasFotos: Record<string, string> = { ...fotosAnteriores };

  // Itera sobre todos os campos definidos
  (camposDef ?? []).forEach((c) => {
    const val = formData.get(c.chave);
    if (val !== null) {
      novosValores[c.chave] = String(val).trim();
    }

    if (c.permite_foto) {
      const fotoVal = formData.get(`foto_${c.chave}`);
      const removerFoto = formData.get(`remover_foto_${c.chave}`);
      if (removerFoto === "1") {
        delete novasFotos[c.chave];
      } else if (fotoVal && String(fotoVal).startsWith("data:image/")) {
        novasFotos[c.chave] = String(fotoVal);
      }
    }
  });

  // Também suporta qualquer campo extra vindo no formData
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("foto_")) {
      const campoKey = k.replace("foto_", "");
      if (String(v).startsWith("data:image/")) {
        novasFotos[campoKey] = String(v);
      }
    } else if (k.startsWith("remover_foto_")) {
      const campoKey = k.replace("remover_foto_", "");
      if (v === "1") {
        delete novasFotos[campoKey];
      }
    } else if (!k.startsWith("$") && k !== "atleta_id" && k !== "checado") {
      novosValores[k] = String(v).trim();
    }
  }

  let checado = existente?.checado ?? false;
  if (podeGerir) {
    checado = formData.get("checado") === "1" || formData.get("checado") === "on";
  }

  const { error } = await supabase.from("dados_cadastrais_atleta").upsert(
    {
      clube_id: perfil.clube_id,
      atleta_id: atletaId,
      valores: novosValores,
      fotos: novasFotos,
      checado,
      atualizado_por: perfil.id,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "clube_id, atleta_id" }
  );

  if (error) {
    console.error("Erro ao salvar dados cadastrais:", error);
    const destino = ehAtleta ? "/dados/meus-dados" : `/dados/${atletaId}`;
    redirect(`${destino}?erro=${encodeURIComponent("Erro ao salvar dados: " + error.message)}`);
  }

  // Se o nome completo mudou e foi informado, atualiza também a tabela usuarios para manter sincronizado
  if (novosValores.nome_completo && podeGerir) {
    await supabase
      .from("usuarios")
      .update({ nome: novosValores.nome_completo })
      .eq("id", atletaId)
      .eq("clube_id", perfil.clube_id);
  }

  revalidatePath("/dados");
  revalidatePath(`/dados/${atletaId}`);
  revalidatePath("/dados/meus-dados");

  const destino = ehAtleta ? "/dados/meus-dados" : `/dados/${atletaId}`;
  redirect(`${destino}?aviso=${encodeURIComponent("Dados cadastrais salvos com sucesso!")}`);
}

/**
 * Alterna rapidamente a checagem de um atleta ("CHECADO?": OK / Pendente)
 */
export async function alternarChecagem(atletaId: string, novoStatus: boolean) {
  const { supabase, perfil } = await obterPerfil();
  if (!["gestor", "comissao_tecnica"].includes(perfil.papel)) {
    throw new Error("Não autorizado.");
  }

  const { error } = await supabase
    .from("dados_cadastrais_atleta")
    .upsert(
      {
        clube_id: perfil.clube_id,
        atleta_id: atletaId,
        checado: novoStatus,
        atualizado_por: perfil.id,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "clube_id, atleta_id" }
    );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dados");
  revalidatePath(`/dados/${atletaId}`);
  return { ok: true, checado: novoStatus };
}

/**
 * Cria um novo campo dinâmico de cadastro para o clube
 */
export async function criarCampoCustomizado(formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  if (!["gestor", "comissao_tecnica"].includes(perfil.papel)) {
    redirect(`/dados?erro=${encodeURIComponent("Permissão insuficiente para gerenciar campos.")}`);
  }

  const rotulo = String(formData.get("rotulo") ?? "").trim();
  const categoria = (String(formData.get("categoria") ?? "outros").trim()) as CategoriaCampo;
  const tipo = (String(formData.get("tipo") ?? "texto").trim()) as TipoCampo;
  const permiteFoto = formData.get("permite_foto") === "1" || formData.get("permite_foto") === "on";
  const obrigatorio = formData.get("obrigatorio") === "1" || formData.get("obrigatorio") === "on";
  const opcoesRaw = String(formData.get("opcoes") ?? "").trim();

  if (!rotulo) {
    redirect(`/dados?erro=${encodeURIComponent("O rótulo do campo é obrigatório.")}`);
  }

  // Gera chave única
  let chave = normalizarChave(rotulo);
  if (!chave || chave.length < 2) {
    chave = `campo_${Date.now()}`;
  }

  // Opções para seleção
  let opcoes: string[] | null = null;
  if (tipo === "selecao" && opcoesRaw) {
    opcoes = opcoesRaw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  }

  // Obtém a maior ordem para posicionar no fim
  const { data: ultimos } = await supabase
    .from("campos_cadastro_atleta")
    .select("ordem")
    .eq("clube_id", perfil.clube_id)
    .order("ordem", { ascending: false })
    .limit(1);

  const novaOrdem = (ultimos?.[0]?.ordem ?? 100) + 10;

  const { error } = await supabase.from("campos_cadastro_atleta").insert({
    clube_id: perfil.clube_id,
    chave,
    rotulo,
    categoria,
    tipo,
    opcoes,
    permite_foto: permiteFoto,
    obrigatorio,
    ordem: novaOrdem,
  });

  if (error) {
    console.error("Erro ao criar campo:", error);
    redirect(`/dados?erro=${encodeURIComponent("Erro ao criar campo: " + error.message)}`);
  }

  revalidatePath("/dados");
  revalidatePath("/dados/meus-dados");
  redirect(`/dados?aviso=${encodeURIComponent(`Campo "${rotulo}" criado com sucesso!`)}`);
}

/**
 * Exclui um campo dinâmico de cadastro
 */
export async function excluirCampoCustomizado(campoId: string) {
  const { supabase, perfil } = await obterPerfil();
  if (!["gestor", "comissao_tecnica"].includes(perfil.papel)) {
    redirect(`/dados?erro=${encodeURIComponent("Permissão insuficiente para excluir campos.")}`);
  }

  const { error } = await supabase
    .from("campos_cadastro_atleta")
    .delete()
    .eq("id", campoId)
    .eq("clube_id", perfil.clube_id);

  if (error) {
    redirect(`/dados?erro=${encodeURIComponent("Erro ao excluir campo: " + error.message)}`);
  }

  revalidatePath("/dados");
  revalidatePath("/dados/meus-dados");
  redirect(`/dados?aviso=${encodeURIComponent("Campo excluído com sucesso!")}`);
}

/**
 * Importa os 42 registros da planilha enviada pelo usuário (CADASTRO_SBMBH27) ou registros fornecidos
 */
export async function importarPlanilhaCadastro() {
  const { supabase, perfil } = await obterPerfil();
  if (!["gestor", "comissao_tecnica"].includes(perfil.papel)) {
    redirect(`/dados?erro=${encodeURIComponent("Permissão insuficiente para importar planilha.")}`);
  }

  // Tenta ler o arquivo scripts/dados_cadastro.json gerado
  let registros: Record<string, any>[] = [];
  try {
    const jsonPath = join(process.cwd(), "scripts", "dados_cadastro.json");
    if (existsSync(jsonPath)) {
      const raw = readFileSync(jsonPath, "utf8").replace(/^\uFEFF/, "");
      registros = JSON.parse(raw);
    }
  } catch (err: any) {
    console.error("Erro lendo JSON:", err);
  }

  if (registros.length === 0) {
    redirect(`/dados?erro=${encodeURIComponent("Arquivo de dados da planilha não encontrado para importação.")}`);
  }

  // Carrega todos os usuários do clube para correlacionar por Nome ou CPF
  const { data: usuariosExistentes } = await supabase
    .from("usuarios")
    .select("id, nome, papel")
    .eq("clube_id", perfil.clube_id);

  const usuariosPorNome: Record<string, { id: string; nome: string; papel: string }> = {};
  (usuariosExistentes ?? []).forEach((u) => {
    usuariosPorNome[normalizarChave(u.nome)] = u;
  });

  let importados = 0;
  let criados = 0;

  for (const reg of registros) {
    const nomeBruto = String(reg["Nome"] || "").trim();
    if (!nomeBruto) continue;

    const tipoCadastro = String(reg["Tipo"] || "Atleta").trim();
    const ehOficial = tipoCadastro.toLowerCase() === "oficial";
    const papelUsuario = ehOficial ? "comissao_tecnica" : "atleta";

    // Procura usuário existente
    const chaveNome = normalizarChave(nomeBruto);
    let usuarioId = usuariosPorNome[chaveNome]?.id;

    if (!usuarioId) {
      // Cria novo usuário no clube
      const { data: novoUsuario, error: erroUsuario } = await supabase
        .from("usuarios")
        .insert({
          clube_id: perfil.clube_id,
          nome: nomeBruto,
          papel: papelUsuario,
          ativo: true,
        })
        .select("id")
        .single();

      if (erroUsuario || !novoUsuario) {
        console.error("Erro ao criar usuário para importação:", nomeBruto, erroUsuario);
        continue;
      }
      usuarioId = novoUsuario.id;
      usuariosPorNome[chaveNome] = { id: usuarioId, nome: nomeBruto, papel: papelUsuario };
      criados++;
    }

    // Mapeia colunas da planilha para o objeto valores
    const valores: Record<string, string> = {};
    for (const [colExcel, colInterna] of Object.entries(MAPA_COLUNAS_EXCEL)) {
      const val = reg[colExcel];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        let strVal = String(val).trim();
        // Converte datas seriais do Excel
        if (colInterna.includes("data") || colInterna.includes("emissao") || colInterna.includes("validade")) {
          strVal = formatarDataExcel(strVal);
        }
        valores[colInterna] = strVal;
      }
    }

    // Garante nome e tipo nos valores
    valores.nome_completo = nomeBruto;
    valores.tipo_cadastro = tipoCadastro;

    const checado = String(reg["CHECADO?"] || "").toUpperCase().trim() === "OK";

    await supabase.from("dados_cadastrais_atleta").upsert(
      {
        clube_id: perfil.clube_id,
        atleta_id: usuarioId,
        valores,
        checado,
        atualizado_por: perfil.id,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "clube_id, atleta_id" }
    );

    importados++;
  }

  revalidatePath("/dados");
  redirect(
    `/dados?aviso=${encodeURIComponent(
      `Planilha importada com sucesso! ${importados} membros cadastrados/sincronizados (${criados} novos perfis criados).`
    )}`
  );
}
