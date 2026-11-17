"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterPerfil } from "@/lib/sessao";
import { hojeChave } from "@/lib/periodo";
import { ROTULO_CARGA, ROTULO_DOR, ROTULO_EXECUCAO } from "@/lib/forca";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const dataBr = (d: string) => d.split("-").reverse().slice(0, 2).join("/");
const PODE_REGISTRAR_POR_OUTRO = ["gestor", "comissao_tecnica"];

export async function salvarForca(atletaId: string, formData: FormData) {
  const { supabase, perfil } = await obterPerfil();
  const proprio = perfil.id === atletaId;
  const dia = texto(formData, "dia");
  const prefixo = proprio ? "/musculacao?" : `/musculacao?atleta=${atletaId}&`;
  const voltar = (tipo: "aviso" | "erro", m: string) =>
    redirect(`${prefixo}${/^\d{4}-\d{2}-\d{2}$/.test(dia) ? `mes=${dia.slice(0, 7)}&dia=${dia}&` : ""}${tipo}=${encodeURIComponent(m)}`);

  if (!proprio && !PODE_REGISTRAR_POR_OUTRO.includes(perfil.papel)) voltar("erro", "Você não tem permissão para registrar por este atleta.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || dia > hojeChave()) voltar("erro", "Escolha um dia que já passou ou hoje.");

  const rpe = Number(texto(formData, "rpe"));
  const duracao = Number(texto(formData, "duracao"));
  const execucao = texto(formData, "execucao");
  const carga = texto(formData, "carga");
  const dor = texto(formData, "dor");
  const disposicaoTxt = texto(formData, "disposicao");
  const disposicao = disposicaoTxt ? Number(disposicaoTxt) : null;

  if (!Number.isInteger(rpe) || rpe < 0 || rpe > 10) voltar("erro", "Informe o RPE da sessão (0 a 10).");
  if (!Number.isInteger(duracao) || duracao < 1 || duracao > 300) voltar("erro", "Informe a duração em minutos (1 a 300).");
  if (!(execucao in ROTULO_EXECUCAO) || !(carga in ROTULO_CARGA) || !(dor in ROTULO_DOR)) voltar("erro", "Há uma resposta inválida no formulário.");
  if (disposicao !== null && (!Number.isInteger(disposicao) || disposicao < 1 || disposicao > 5)) voltar("erro", "A disposição deve ser de 1 a 5.");

  const { error } = await supabase.from("sessoes_forca").upsert({
    atleta_id: atletaId, dia, rpe, duracao_min: duracao, execucao, carga_percebida: carga, disposicao, dor,
    treino: texto(formData, "treino").slice(0, 120) || null,
    dor_local: dor === "nenhuma" ? null : texto(formData, "dor_local").slice(0, 120) || null,
    comentario: texto(formData, "comentario").slice(0, 1000) || null,
    registrado_por: perfil.id,
  }, { onConflict: "atleta_id,dia" });
  if (error) voltar("erro", "Não foi possível salvar o registro.");

  revalidatePath("/musculacao");
  voltar("aviso", `Treino de ${dataBr(dia)} registrado: RPE ${rpe}, ${duracao} min.${dor === "forte" ? " Você marcou dor forte. Avise a comissão técnica antes do próximo treino." : ""}`);
}

export async function excluirForca(atletaId: string, dia: string) {
  const { supabase, perfil } = await obterPerfil();
  const proprio = perfil.id === atletaId;
  const prefixo = proprio ? "/musculacao?" : `/musculacao?atleta=${atletaId}&`;
  if (!proprio && !PODE_REGISTRAR_POR_OUTRO.includes(perfil.papel)) redirect(`${prefixo}erro=` + encodeURIComponent("Você não tem permissão para excluir este registro."));
  const { error } = await supabase.from("sessoes_forca").delete().eq("atleta_id", atletaId).eq("dia", dia);
  if (error) redirect(`${prefixo}erro=` + encodeURIComponent("Não foi possível excluir o registro."));
  revalidatePath("/musculacao");
  redirect(`${prefixo}mes=${dia.slice(0, 7)}&dia=${dia}&aviso=` + encodeURIComponent(`Registro de ${dataBr(dia)} excluído.`));
}
