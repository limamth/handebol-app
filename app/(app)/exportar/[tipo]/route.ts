import { NextResponse } from "next/server";
import { obterPerfil } from "@/lib/sessao";
import { podeVer, type Modulo } from "@/lib/permissions";
import { chaveDia } from "@/lib/datas";
import { hojeChave, inicioDoDia, somarDias } from "@/lib/periodo";
import { PERGUNTAS_BEM_ESTAR, mediaRespostas } from "@/lib/monitorizacao";
import { ROTULO_PRESENCA, ROTULO_TIPO } from "@/components/calendario/tipos";
import { ROTULO_CARGA, ROTULO_DOR, ROTULO_EXECUCAO } from "@/lib/forca";

const MODULO: Record<string, Modulo> = { carga: "monitorizacao", "bem-estar": "monitorizacao", presencas: "estatisticas", testes: "avaliacoes", musculacao: "musculacao" };

const um = (o: any) => (Array.isArray(o) ? o[0] : o);
const dataBr = (d: string) => d.split("-").reverse().join("/");
const num = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(Math.round(Number(n) * 100) / 100).replace(".", ","));
// Texto digitado por pessoas: evita que o Excel trate "=..." como fórmula
const txt = (s: unknown) => { const v = String(s ?? ""); return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v; };
const celula = (v: string) => (/[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
// Ponto e vírgula e BOM UTF-8: o Excel em português abre direto, com os acentos certos
const csv = (cabecalho: string[], linhas: string[][]) => "\uFEFF" + [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n") + "\r\n";

// O banco devolve no máximo 1000 linhas por consulta, então buscamos em páginas
async function paginar(pagina: (de: number, ate: number) => PromiseLike<{ data: any[] | null; error: any }>) {
  const tudo: any[] = [];
  for (let de = 0; de < 50000; de += 1000) {
    const { data, error } = await pagina(de, de + 999);
    if (error) throw error;
    tudo.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return tudo;
}

export async function GET(request: Request, { params }: { params: { tipo: string } }) {
  const { supabase, perfil } = await obterPerfil();
  const modulo = MODULO[params.tipo];
  if (!modulo) return new NextResponse("Tipo de exportação desconhecido.", { status: 404 });
  if (perfil.papel === "atleta" || !podeVer(perfil.papel, modulo)) return new NextResponse("Sem permissão.", { status: 403 });

  const url = new URL(request.url);
  const dias = [30, 90, 365].includes(Number(url.searchParams.get("dias"))) ? Number(url.searchParams.get("dias")) : 90;
  const hoje = hojeChave();
  const desde = somarDias(hoje, -(dias - 1));
  const inicio = inicioDoDia(desde);

  try {
    let corpo = "";

    if (params.tipo === "carga") {
      const dados = await paginar((de, ate) => supabase.from("rpe_sessao")
        .select("rpe, minutos, carga_ua, registrado_em, usuarios(nome), sessoes!inner(titulo, tipo, inicio, equipas(nome))")
        .gte("sessoes.inicio", inicio).order("registrado_em").range(de, ate));
      const linhas = dados.map((r) => { const s = um(r.sessoes); return { quando: s.inicio as string, l: [dataBr(chaveDia(s.inicio)), txt(s.titulo), ROTULO_TIPO[s.tipo] ?? s.tipo, txt(um(s.equipas)?.nome), txt(um(r.usuarios)?.nome), num(r.rpe), num(r.minutos), num(r.carga_ua)] }; });
      linhas.sort((a, b) => a.quando.localeCompare(b.quando));
      corpo = csv(["Data", "Sessão", "Tipo", "Equipa", "Atleta", "RPE", "Minutos", "Carga (UA)"], linhas.map((x) => x.l));
    }

    if (params.tipo === "bem-estar") {
      const dados = await paginar((de, ate) => supabase.from("respostas_questionario")
        .select("id, dia, respostas, usuarios(nome)").gte("dia", desde).order("dia").order("id").range(de, ate));
      const linhas = dados.map((r) => {
        const media = mediaRespostas(r.respostas ?? {});
        return [dataBr(r.dia), txt(um(r.usuarios)?.nome), ...PERGUNTAS_BEM_ESTAR.map((p) => num(r.respostas?.[p.chave])), media === null ? "" : num(media)];
      });
      corpo = csv(["Data", "Atleta", ...PERGUNTAS_BEM_ESTAR.map((p) => p.pergunta), "Média"], linhas);
    }

    if (params.tipo === "presencas") {
      const dados = await paginar((de, ate) => supabase.from("presencas")
        .select("status, sessao_id, atleta_id, usuarios(nome), sessoes!inner(titulo, inicio, equipas(nome))")
        .gte("sessoes.inicio", inicio).order("sessao_id").order("atleta_id").range(de, ate));
      const linhas = dados.map((p) => { const s = um(p.sessoes); return { quando: s.inicio as string, l: [dataBr(chaveDia(s.inicio)), txt(s.titulo), txt(um(s.equipas)?.nome), txt(um(p.usuarios)?.nome), ROTULO_PRESENCA[p.status] ?? p.status] }; });
      linhas.sort((a, b) => a.quando.localeCompare(b.quando));
      corpo = csv(["Data", "Sessão", "Equipa", "Atleta", "Situação"], linhas.map((x) => x.l));
    }

    if (params.tipo === "testes") {
      const teste = url.searchParams.get("teste");
      const dados = await paginar((de, ate) => {
        let q = supabase.from("resultados_teste")
          .select("id, valor, medido_em, usuarios:usuarios!atleta_id(nome), definicoes_teste(nome, categoria, unidade)")
          .order("medido_em").order("id").range(de, ate);
        if (teste && /^[0-9a-f-]{36}$/i.test(teste)) q = q.eq("definicao_id", teste);
        return q;
      });
      corpo = csv(["Teste", "Categoria", "Atleta", "Data", "Resultado", "Unidade"],
        dados.map((r) => { const d = um(r.definicoes_teste); return [txt(d?.nome), txt(d?.categoria), txt(um(r.usuarios)?.nome), dataBr(r.medido_em), num(r.valor), txt(d?.unidade)]; }));
    }

    if (params.tipo === "musculacao") {
      const dados = await paginar((de, ate) => supabase.from("sessoes_forca")
        .select("id, dia, treino, duracao_min, rpe, carga_ua, execucao, carga_percebida, disposicao, dor, dor_local, comentario, usuarios:usuarios!atleta_id(nome)")
        .gte("dia", desde).order("dia").order("id").range(de, ate));
      corpo = csv(["Data", "Atleta", "Treino", "Duração (min)", "RPE", "Carga (UA)", "Execução", "Carga comparada ao planejado", "Disposição (1-5)", "Dor", "Local da dor", "Comentário"],
        dados.map((r) => [dataBr(r.dia), txt(um(r.usuarios)?.nome), txt(r.treino), num(r.duracao_min), num(r.rpe), num(r.carga_ua), ROTULO_EXECUCAO[r.execucao] ?? r.execucao, ROTULO_CARGA[r.carga_percebida] ?? r.carga_percebida, num(r.disposicao), ROTULO_DOR[r.dor] ?? r.dor, txt(r.dor_local), txt(r.comentario)]));
    }

    return new NextResponse(corpo, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${params.tipo}-${hoje}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Não foi possível gerar o arquivo. Tente de novo.", { status: 500 });
  }
}
