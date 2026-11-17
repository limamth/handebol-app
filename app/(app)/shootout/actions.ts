"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterPerfil } from "@/lib/sessao";
import { podeEditar } from "@/lib/permissions";
import { chaveDia } from "@/lib/datas";
import { ESTILOS_GOLEIRO, ROTULO_RESULTADO, TIPOS_BATIDA, carregarFases, faseDaData } from "@/lib/shootout";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const uuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);
const dataOk = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
const atualizarTudo = () => revalidatePath("/shootout", "layout");

async function exigirEdicao() {
  const { supabase, perfil } = await obterPerfil();
  if (!podeEditar(perfil.papel, "shootout")) redirect("/shootout?erro=" + encodeURIComponent("Você não tem permissão para registrar ou editar no Shoot-out."));
  return { supabase, perfil };
}
// Só aceita voltar para páginas do próprio Shoot-out
const destino = (url: string, padrao: string) => (url.startsWith("/shootout") && !url.startsWith("//") ? url : padrao);
function comMensagem(url: string, tipo: "aviso" | "erro", msg: string) {
  const [caminho, query = ""] = url.split("?");
  const p = new URLSearchParams(query); p.delete("aviso"); p.delete("erro"); p.set(tipo, msg);
  return `${caminho}?${p}`;
}

// ---------- Registro rápido ----------
export async function registrarBatida(formData: FormData) {
  const { supabase, perfil } = await exigirEdicao();
  const sessao = texto(formData, "sessao"), batedor = texto(formData, "batedor"), goleiro = texto(formData, "goleiro");
  const tipo = texto(formData, "tipo"), resultado = texto(formData, "resultado"), observacao = texto(formData, "observacao").slice(0, 300);
  const volta = (k: "aviso" | "erro", m: string) => { const p = new URLSearchParams({ sessao, batedor, goleiro, tipo }); p.set(k, m); redirect(`/shootout/registro?${p}`); };

  if (!uuid(sessao)) volta("erro", "Escolha a sessão.");
  const batedorExterno = batedor === "externo", goleiroExterno = goleiro === "externo";
  if (!batedorExterno && !uuid(batedor)) volta("erro", "Escolha o atleta que bateu.");
  if (!goleiroExterno && !uuid(goleiro)) volta("erro", "Escolha o goleiro.");
  if (!(resultado in ROTULO_RESULTADO)) volta("erro", "Escolha Convertido ou Perdido.");
  if (tipo && !(tipo in TIPOS_BATIDA)) volta("erro", "Tipo de batida inválido.");

  const { error } = await supabase.from("shootout_batidas").insert({
    shootout_sessao_id: sessao,
    batedor_id: batedorExterno ? null : batedor, batedor_externo: batedorExterno,
    goleiro_id: goleiroExterno ? null : goleiro, goleiro_externo: goleiroExterno,
    resultado, tipo: tipo || null, observacao: observacao || null, registrado_por: perfil.id,
  });
  if (error) volta("erro", "Não foi possível registrar a batida.");
  atualizarTudo();
  volta("aviso", `${ROTULO_RESULTADO[resultado]} registrado.`);
}

export async function desfazerUltima(sessaoId: string, formData: FormData) {
  const { supabase } = await exigirEdicao();
  const p = new URLSearchParams({ sessao: sessaoId, batedor: texto(formData, "batedor"), goleiro: texto(formData, "goleiro"), tipo: texto(formData, "tipo") });
  const volta = (k: "aviso" | "erro", m: string) => { p.set(k, m); redirect(`/shootout/registro?${p}`); };

  const { data: ultima } = await supabase.from("shootout_batidas").select("id").eq("shootout_sessao_id", sessaoId).order("criado_em", { ascending: false }).limit(1);
  if (!ultima?.length) volta("erro", "Esta sessão ainda não tem batidas.");
  const { error } = await supabase.from("shootout_batidas").delete().eq("id", ultima![0].id);
  if (error) volta("erro", "Não foi possível desfazer.");
  atualizarTudo();
  volta("aviso", "Última batida desfeita.");
}

// ---------- Batidas (editar e excluir) ----------
export async function atualizarBatida(batidaId: string, formData: FormData) {
  const { supabase } = await exigirEdicao();
  const volta = destino(texto(formData, "volta"), "/shootout/batidas");
  const erro = (m: string) => redirect(comMensagem(volta, "erro", m));
  const batedor = texto(formData, "batedor"), goleiro = texto(formData, "goleiro"), resultado = texto(formData, "resultado"), tipo = texto(formData, "tipo");
  const batedorExterno = batedor === "externo", goleiroExterno = goleiro === "externo";
  if (!batedorExterno && !uuid(batedor)) erro("Escolha o atleta que bateu.");
  if (!goleiroExterno && !uuid(goleiro)) erro("Escolha o goleiro.");
  if (!(resultado in ROTULO_RESULTADO)) erro("Escolha Convertido ou Perdido.");
  if (tipo && !(tipo in TIPOS_BATIDA)) erro("Tipo de batida inválido.");

  const { data, error } = await supabase.from("shootout_batidas").update({
    batedor_id: batedorExterno ? null : batedor, batedor_externo: batedorExterno,
    goleiro_id: goleiroExterno ? null : goleiro, goleiro_externo: goleiroExterno,
    resultado, tipo: tipo || null, observacao: texto(formData, "observacao").slice(0, 300) || null,
  }).eq("id", batidaId).select("id");
  if (error || !data?.length) erro("Não foi possível salvar as alterações.");
  atualizarTudo();
  redirect(comMensagem(volta, "aviso", "Batida atualizada."));
}

export async function excluirBatida(batidaId: string, formData: FormData) {
  const { supabase } = await exigirEdicao();
  const volta = destino(texto(formData, "volta"), "/shootout/batidas");
  const { data, error } = await supabase.from("shootout_batidas").delete().eq("id", batidaId).select("id");
  if (error || !data?.length) redirect(comMensagem(volta, "erro", "Não foi possível excluir a batida."));
  atualizarTudo();
  redirect(comMensagem(volta, "aviso", "Batida excluída."));
}

// ---------- Sessões ----------
async function lerSessao(supabase: any, formData: FormData, erro: (m: string) => never) {
  let data = texto(formData, "data");
  let nome = texto(formData, "nome");
  const calendarioId = texto(formData, "calendario");
  if (calendarioId && !uuid(calendarioId)) erro("Sessão do calendário inválida.");
  if (calendarioId) {
    const { data: cal } = await supabase.from("sessoes").select("inicio, titulo").eq("id", calendarioId).single();
    if (!cal) erro("Sessão do calendário não encontrada.");
    data = chaveDia(cal.inicio);   // ligada ao calendário: vale a data da sessão do calendário
    if (!nome) nome = cal.titulo;
  }
  if (!dataOk(data)) erro("Informe a data da sessão, ou ligue a uma sessão do calendário.");

  const fasePar = texto(formData, "fase");
  let faseId: string | null = null;
  if (fasePar === "sem") faseId = null;
  else if (uuid(fasePar)) faseId = fasePar;
  else faseId = faseDaData(await carregarFases(supabase), data);

  return { nome: nome || null, data, fase_id: faseId, sessao_calendario_id: calendarioId || null, observacoes: texto(formData, "observacoes").slice(0, 500) || null };
}

export async function criarSessao(formData: FormData) {
  const { supabase, perfil } = await exigirEdicao();
  const erro = (m: string): never => redirect("/shootout/sessoes?erro=" + encodeURIComponent(m));
  const dados = await lerSessao(supabase, formData, erro);
  const { data, error } = await supabase.from("shootout_sessoes").insert({ clube_id: perfil.clube_id, ...dados }).select("id").single();
  if (error || !data) erro("Não foi possível criar a sessão.");
  atualizarTudo();
  redirect(`/shootout/registro?sessao=${data!.id}&aviso=` + encodeURIComponent("Sessão criada. Já pode registrar as batidas."));
}

export async function atualizarSessao(sessaoId: string, formData: FormData) {
  const { supabase } = await exigirEdicao();
  const erro = (m: string): never => redirect("/shootout/sessoes?erro=" + encodeURIComponent(m));
  const dados = await lerSessao(supabase, formData, erro);
  const { data, error } = await supabase.from("shootout_sessoes").update(dados).eq("id", sessaoId).select("id");
  if (error || !data?.length) erro("Não foi possível salvar as alterações.");
  atualizarTudo();
  redirect("/shootout/sessoes?aviso=" + encodeURIComponent("Sessão atualizada."));
}

export async function excluirSessao(sessaoId: string) {
  const { supabase } = await exigirEdicao();
  const { count } = await supabase.from("shootout_batidas").select("id", { count: "exact", head: true }).eq("shootout_sessao_id", sessaoId);
  const { data, error } = await supabase.from("shootout_sessoes").delete().eq("id", sessaoId).select("id");
  if (error || !data?.length) redirect("/shootout/sessoes?erro=" + encodeURIComponent("Não foi possível excluir a sessão."));
  atualizarTudo();
  redirect("/shootout/sessoes?aviso=" + encodeURIComponent(`Sessão excluída${count ? ` (${count} batida${count > 1 ? "s" : ""} também apagada${count > 1 ? "s" : ""})` : ""}.`));
}

// ---------- Goleiros ----------
export async function adicionarGoleiro(formData: FormData) {
  const { supabase } = await exigirEdicao();
  const erro = (m: string): never => redirect("/shootout/goleiros?erro=" + encodeURIComponent(m));
  const atleta = texto(formData, "atleta"), estilo = texto(formData, "estilo");
  if (!uuid(atleta)) erro("Escolha o atleta.");
  if (!(estilo in ESTILOS_GOLEIRO)) erro("Escolha o estilo: Baliza ou Saída.");
  const { error } = await supabase.from("shootout_goleiros").upsert({ atleta_id: atleta, estilo, observacoes: texto(formData, "observacoes").slice(0, 500) || null, ativo: true }, { onConflict: "atleta_id" });
  if (error) erro("Não foi possível cadastrar o goleiro.");
  atualizarTudo();
  redirect("/shootout/goleiros?aviso=" + encodeURIComponent("Goleiro cadastrado."));
}

export async function atualizarGoleiro(atletaId: string, formData: FormData) {
  const { supabase } = await exigirEdicao();
  const erro = (m: string): never => redirect("/shootout/goleiros?erro=" + encodeURIComponent(m));
  const estilo = texto(formData, "estilo");
  if (!(estilo in ESTILOS_GOLEIRO)) erro("Escolha o estilo: Baliza ou Saída.");
  const { data, error } = await supabase.from("shootout_goleiros")
    .update({ estilo, observacoes: texto(formData, "observacoes").slice(0, 500) || null, ativo: formData.get("ativo") === "on" })
    .eq("atleta_id", atletaId).select("atleta_id");
  if (error || !data?.length) erro("Não foi possível salvar as alterações.");
  atualizarTudo();
  redirect("/shootout/goleiros?aviso=" + encodeURIComponent("Goleiro atualizado."));
}

export async function removerGoleiro(atletaId: string) {
  const { supabase } = await exigirEdicao();
  const { error } = await supabase.from("shootout_goleiros").delete().eq("atleta_id", atletaId);
  if (error) redirect("/shootout/goleiros?erro=" + encodeURIComponent("Não foi possível remover."));
  atualizarTudo();
  redirect("/shootout/goleiros?aviso=" + encodeURIComponent("Goleiro removido da lista. As batidas já registradas continuam."));
}
