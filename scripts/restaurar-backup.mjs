// Restaura um backup do Handebol Hub em um projeto Supabase NOVO e VAZIO (com as migrações já rodadas).
//
// Uso (PowerShell, na pasta do app):
//   $env:SUPABASE_URL="https://SEU-NOVO-PROJETO.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="chave service_role (secreta)"
//   node scripts/restaurar-backup.mjs "C:\caminho\backup-handebol-hub-AAAA-MM-DD.json"
//
// Os logins não são restaurados (as senhas ficam no serviço de login). Cada gestor recebe um código
// de acesso para entrar em "primeiro acesso"; os demais usuários ganham códigos novos em Utilizadores.

import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

export const ORDEM_RESTAURACAO = [
  "clubes", "usuarios", "equipas", "membros_equipa", "diagramas", "exercicios", "sessoes", "sessao_exercicios", "presencas",
  "definicoes_teste", "resultados_teste", "questionarios", "respostas_questionario", "fases_treinamento", "fase_convocados",
  "rpe_sessao", "sessoes_forca", "shootout_goleiros", "shootout_sessoes", "shootout_batidas",
];
const COLUNAS_GERADAS = { rpe_sessao: ["carga_ua"], sessoes_forca: ["carga_ua"] };   // calculadas pelo banco
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const gerarCodigo = () => Array.from(randomBytes(8), (b) => ALFABETO[b % 32]).join("");

export function prepararLinhas(tabela, linhas) {
  const geradas = COLUNAS_GERADAS[tabela] ?? [];
  return linhas.map((l) => {
    const copia = { ...l };
    geradas.forEach((c) => delete copia[c]);
    if (tabela === "usuarios") copia.auth_id = null;
    return copia;
  });
}

export async function restaurar(backup, supabase, log = console.log) {
  if (backup?.formato !== "handebol-hub-backup") throw new Error("Este arquivo não parece um backup do Handebol Hub.");

  const { count } = await supabase.from("clubes").select("id", { count: "exact", head: true });
  if (count) throw new Error("O projeto de destino precisa estar vazio: já existe um clube nele.");

  for (const tabela of ORDEM_RESTAURACAO) {
    const linhas = prepararLinhas(tabela, backup.tabelas?.[tabela] ?? []);
    for (let i = 0; i < linhas.length; i += 500) {
      const { error } = await supabase.from(tabela).insert(linhas.slice(i, i + 500));
      if (error) throw new Error(`Falha ao restaurar "${tabela}": ${error.message}`);
    }
    log(`${tabela}: ${linhas.length} linha(s)`);
  }

  const codigos = [];
  for (const g of (backup.tabelas?.usuarios ?? []).filter((u) => u.papel === "gestor")) {
    const codigo = gerarCodigo();
    const { error } = await supabase.from("convites").upsert({ usuario_id: g.id, codigo }, { onConflict: "usuario_id" });
    if (error) throw new Error(`Falha ao gerar o código de ${g.nome}: ${error.message}`);
    codigos.push({ nome: g.nome, codigo });
  }
  return codigos;
}

async function principal() {
  const [, , arquivo] = process.argv;
  const url = process.env.SUPABASE_URL, chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!arquivo || !url || !chave) {
    console.error("Uso: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY e rode: node scripts/restaurar-backup.mjs <arquivo.json>");
    process.exit(1);
  }
  const backup = JSON.parse(readFileSync(arquivo, "utf-8"));
  const supabase = createClient(url, chave, { auth: { persistSession: false } });
  try {
    const codigos = await restaurar(backup, supabase);
    console.log("\nRestauração concluída. Códigos de acesso dos gestores (use em “primeiro acesso”):");
    codigos.forEach((c) => console.log(`  ${c.nome}: ${c.codigo}`));
  } catch (e) {
    console.error(`\nERRO: ${e.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) principal();
