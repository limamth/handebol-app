"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  User,
  Users,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Camera,
} from "lucide-react";
import type { CampoCadastro, RegistroCadastral } from "@/lib/dados-atletas";
import { alternarChecagem, importarPlanilhaCadastro } from "@/app/(app)/dados/actions";
import { ModalGerenciarCampos } from "./ModalGerenciarCampos";
import { ModalResumoUniformes } from "./ModalResumoUniformes";

interface TabelaCentralDadosProps {
  atletas: any[];
  cadastros: Record<string, RegistroCadastral>;
  campos: CampoCadastro[];
  podeGerir: boolean;
}

export function TabelaCentralDados({ atletas, cadastros, campos, podeGerir }: TabelaCentralDadosProps) {
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "atleta" | "oficial" | "sem_equipa">("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ok" | "pendente">("todos");
  const [secaoVisualizacao, setSecaoVisualizacao] = useState<"geral" | "documentos" | "uniformes">("geral");
  const [isPending, startTransition] = useTransition();
  const [importando, setImportando] = useState(false);

  // Contadores
  const totalMembros = atletas.length;
  const totalChecados = atletas.filter((a) => cadastros[a.id]?.checado).length;
  const totalPendentes = totalMembros - totalChecados;
  const totalAtletas = atletas.filter((a) => {
    const reg = cadastros[a.id];
    const tipo = reg?.valores?.tipo_cadastro?.toLowerCase() || (a.papel === "atleta" ? "atleta" : "oficial");
    return tipo === "atleta";
  }).length;
  const totalOficiais = totalMembros - totalAtletas;
  const totalSemEquipa = atletas.filter((a) => {
    const ehAtleta = (cadastros[a.id]?.valores?.tipo_cadastro?.toLowerCase() || a.papel) === "atleta";
    return ehAtleta && (!a.membros_equipa || a.membros_equipa.length === 0);
  }).length;

  // Filtragem dos membros
  const filtrados = atletas.filter((a) => {
    const reg = cadastros[a.id];
    const valores = reg?.valores ?? {};
    const tipo = (valores.tipo_cadastro?.toLowerCase() || (a.papel === "atleta" ? "atleta" : "oficial"));
    const temEquipa = a.membros_equipa && a.membros_equipa.length > 0;

    // Filtro tipo
    if (filtroTipo === "atleta" && tipo !== "atleta") return false;
    if (filtroTipo === "oficial" && tipo !== "oficial") return false;
    if (filtroTipo === "sem_equipa") {
      if (tipo !== "atleta" || temEquipa) return false;
    }

    // Filtro status
    const isOk = !!reg?.checado;
    if (filtroStatus === "ok" && !isOk) return false;
    if (filtroStatus === "pendente" && isOk) return false;

    // Filtro busca
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      const nomeMatch = (a.nome || "").toLowerCase().includes(termo);
      const cpfMatch = (valores.cpf || "").toLowerCase().includes(termo);
      const rgMatch = (valores.rg_numero || "").toLowerCase().includes(termo);
      const passMatch = (valores.passaporte_numero || "").toLowerCase().includes(termo);
      const emailMatch = (valores.email || "").toLowerCase().includes(termo);
      const contatoMatch = (valores.contato || "").toLowerCase().includes(termo);
      const funcaoMatch = (valores.funcao || a.posicao || "").toLowerCase().includes(termo);
      return nomeMatch || cpfMatch || rgMatch || passMatch || emailMatch || contatoMatch || funcaoMatch;
    }

    return true;
  });

  const handleAlternarChecado = (atletaId: string, atual: boolean) => {
    startTransition(async () => {
      try {
        await alternarChecagem(atletaId, !atual);
      } catch (err: any) {
        alert("Erro ao alterar checagem: " + err.message);
      }
    });
  };

  const exportarCsvCompleto = () => {
    // Cabeçalho
    const cabecalhosExport = ["CHECADO?", "Tipo", "Nome Completo", ...campos.map((c) => c.rotulo)];
    let csv = cabecalhosExport.map((h) => `"${h.replace(/"/g, '""')}"`).join(";") + "\n";

    // Linhas
    filtrados.forEach((a) => {
      const reg = cadastros[a.id];
      const vals = reg?.valores ?? {};
      const statusOk = reg?.checado ? "OK" : "PENDENTE";
      const tipo = vals.tipo_cadastro || (a.papel === "atleta" ? "Atleta" : "Oficial");

      const linha = [
        statusOk,
        tipo,
        a.nome,
        ...campos.map((c) => {
          const v = vals[c.chave] ?? "";
          return String(v).replace(/"/g, '""');
        }),
      ];
      csv += linha.map((v) => `"${v}"`).join(";") + "\n";
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `banco_dados_atletas_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas e Ações Rápidas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-linha bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-suave uppercase tracking-wider">Total Cadastrado</p>
            <p className="font-titulo text-2xl font-bold text-tinta mt-1">{totalMembros}</p>
            <p className="text-xs text-suave mt-0.5">{totalAtletas} Atletas · {totalOficiais} Oficiais</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-quadra-100 text-quadra-700">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-xl border border-linha bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-suave uppercase tracking-wider">Checados (OK)</p>
            <p className="font-titulo text-2xl font-bold text-emerald-600 mt-1">{totalChecados}</p>
            <p className="text-xs text-suave mt-0.5">
              {totalMembros > 0 ? Math.round((totalChecados / totalMembros) * 100) : 0}% validados
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-xl border border-linha bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-suave uppercase tracking-wider">Pendentes</p>
            <p className="font-titulo text-2xl font-bold text-amber-600 mt-1">{totalPendentes}</p>
            <p className="text-xs text-suave mt-0.5">Aguardando conferência</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-xl border border-linha bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-suave uppercase tracking-wider">Campos do Banco</p>
            <p className="font-titulo text-2xl font-bold text-bola-600 mt-1">{campos.length}</p>
            <p className="text-xs text-suave mt-0.5">Dinâmicos e personalizáveis</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bola-50 text-bola-600">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Barra de Ferramentas e Filtros */}
      <div className="rounded-xl border border-linha bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Busca textual */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-suave" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, RG, passaporte, e-mail..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-md border border-linha bg-fundo pl-9 pr-3 py-2 text-sm text-tinta focus:border-bola-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center gap-2">
            <ModalResumoUniformes atletas={atletas} cadastros={cadastros} campos={campos} />

            {podeGerir && <ModalGerenciarCampos campos={campos} />}

            <button
              type="button"
              onClick={exportarCsvCompleto}
              className="inline-flex items-center gap-1.5 rounded-md border border-linha bg-white px-3 py-2 text-sm font-medium text-tinta shadow-sm hover:bg-cinza-50"
              title="Exportar dados em formato CSV para abrir no Excel"
            >
              <Download className="h-4 w-4 text-suave" />
              Exportar CSV
            </button>

            {podeGerir && totalMembros === 0 && (
              <form
                action={async () => {
                  if (confirm("Deseja sincronizar e importar os 42 membros da planilha CADASTRO_SBMBH27?")) {
                    setImportando(true);
                    await importarPlanilhaCadastro();
                  }
                }}
              >
                <button
                  type="submit"
                  disabled={importando}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${importando ? "animate-spin" : ""}`} />
                  {importando ? "Importando..." : "Importar Planilha (42 Membros)"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Linha secundária de filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linha pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-suave flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Tipo:
            </span>
            <div className="inline-flex rounded-md border border-linha bg-fundo p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setFiltroTipo("todos")}
                className={`rounded px-2.5 py-1 font-medium transition ${
                  filtroTipo === "todos" ? "bg-white text-tinta shadow-sm font-semibold" : "text-suave hover:text-tinta"
                }`}
              >
                Todos ({totalMembros})
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo("atleta")}
                className={`rounded px-2.5 py-1 font-medium transition ${
                  filtroTipo === "atleta" ? "bg-white text-tinta shadow-sm font-semibold" : "text-suave hover:text-tinta"
                }`}
              >
                Atletas ({totalAtletas})
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo("oficial")}
                className={`rounded px-2.5 py-1 font-medium transition ${
                  filtroTipo === "oficial" ? "bg-white text-tinta shadow-sm font-semibold" : "text-suave hover:text-tinta"
                }`}
              >
                Oficiais ({totalOficiais})
              </button>
              {totalSemEquipa > 0 && (
                <button
                  type="button"
                  onClick={() => setFiltroTipo("sem_equipa")}
                  className={`rounded px-2.5 py-1 font-medium transition ${
                    filtroTipo === "sem_equipa"
                      ? "bg-amber-100 text-amber-900 font-bold shadow-sm"
                      : "text-amber-700 hover:text-amber-900 font-medium"
                  }`}
                >
                  Sem Equipa ({totalSemEquipa})
                </button>
              )}
            </div>

            <span className="text-xs font-semibold text-suave ml-2">Status:</span>
            <div className="inline-flex rounded-md border border-linha bg-fundo p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setFiltroStatus("todos")}
                className={`rounded px-2.5 py-1 font-medium transition ${
                  filtroStatus === "todos" ? "bg-white text-tinta shadow-sm font-semibold" : "text-suave hover:text-tinta"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus("ok")}
                className={`rounded px-2.5 py-1 font-medium transition ${
                  filtroStatus === "ok" ? "bg-emerald-100 text-emerald-800 font-semibold" : "text-suave hover:text-tinta"
                }`}
              >
                OK ({totalChecados})
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus("pendente")}
                className={`rounded px-2.5 py-1 font-medium transition ${
                  filtroStatus === "pendente" ? "bg-amber-100 text-amber-800 font-semibold" : "text-suave hover:text-tinta"
                }`}
              >
                Pendentes ({totalPendentes})
              </button>
            </div>
          </div>

          {/* Seletor de colunas a exibir */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-suave">Visualização:</span>
            <div className="inline-flex rounded-md border border-linha bg-fundo p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setSecaoVisualizacao("geral")}
                className={`rounded px-2 py-1 font-medium ${
                  secaoVisualizacao === "geral" ? "bg-white text-tinta shadow-sm font-semibold" : "text-suave"
                }`}
              >
                Geral
              </button>
              <button
                type="button"
                onClick={() => setSecaoVisualizacao("documentos")}
                className={`rounded px-2 py-1 font-medium ${
                  secaoVisualizacao === "documentos" ? "bg-white text-tinta shadow-sm font-semibold" : "text-suave"
                }`}
              >
                Docs & Viagem
              </button>
              <button
                type="button"
                onClick={() => setSecaoVisualizacao("uniformes")}
                className={`rounded px-2 py-1 font-medium ${
                  secaoVisualizacao === "uniformes" ? "bg-white text-tinta shadow-sm font-semibold" : "text-suave"
                }`}
              >
                Uniformes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Dados */}
      <div className="overflow-hidden rounded-xl border border-linha bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-linha bg-fundo text-suave uppercase font-semibold">
              <tr>
                <th className="px-3 py-3 w-12 text-center">Status</th>
                <th className="px-4 py-3 min-w-[200px]">Nome & Foto</th>
                <th className="px-3 py-3">Tipo / Função</th>

                {secaoVisualizacao === "geral" && (
                  <>
                    <th className="px-3 py-3">Contato</th>
                    <th className="px-3 py-3">CPF</th>
                    <th className="px-3 py-3">Passaporte</th>
                    <th className="px-3 py-3">Camisa</th>
                    <th className="px-3 py-3">Tênis</th>
                  </>
                )}

                {secaoVisualizacao === "documentos" && (
                  <>
                    <th className="px-3 py-3">CPF</th>
                    <th className="px-3 py-3">RG</th>
                    <th className="px-3 py-3">Passaporte Nº</th>
                    <th className="px-3 py-3">Validade Passaporte</th>
                    <th className="px-3 py-3">Visto USA</th>
                  </>
                )}

                {secaoVisualizacao === "uniformes" && (
                  <>
                    <th className="px-2 py-3 text-center">Agasalho</th>
                    <th className="px-2 py-3 text-center">Camisa</th>
                    <th className="px-2 py-3 text-center">Bermuda</th>
                    <th className="px-2 py-3 text-center">Calça</th>
                    <th className="px-2 py-3 text-center">Short</th>
                    <th className="px-2 py-3 text-center">Chinelo</th>
                    <th className="px-2 py-3 text-center">Tênis</th>
                  </>
                )}

                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-suave">
                    Nenhum membro encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filtrados.map((atleta) => {
                  const reg = cadastros[atleta.id];
                  const vals = reg?.valores ?? {};
                  const fotos = reg?.fotos ?? {};
                  const isOk = !!reg?.checado;
                  const tipo = vals.tipo_cadastro || (atleta.papel === "atleta" ? "Atleta" : "Oficial");

                  return (
                    <tr key={atleta.id} className="hover:bg-fundo/70 transition">
                      {/* Checkbox / Botão de Status Rápido */}
                      <td className="px-3 py-3 text-center">
                        {podeGerir ? (
                          <button
                            type="button"
                            onClick={() => handleAlternarChecado(atleta.id, isOk)}
                            title={isOk ? "Marcado como conferido (clique para alternar)" : "Pendente (clique para aprovar)"}
                            className={`inline-flex items-center justify-center h-7 w-7 rounded-full transition ${
                              isOk
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            }`}
                          >
                            {isOk ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center justify-center h-6 w-6 rounded-full ${
                              isOk ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {isOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                          </span>
                        )}
                      </td>

                      {/* Nome e Foto */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {fotos["foto_perfil"] ? (
                            <img
                              src={fotos["foto_perfil"]}
                              alt={atleta.nome}
                              className="h-8 w-8 rounded-full object-cover border border-linha flex-shrink-0"
                            />
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-quadra-900 font-bold text-white text-[11px] flex-shrink-0">
                              {atleta.nome
                                .split(" ")
                                .map((p: string) => p[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <Link
                              href={`/dados/${atleta.id}`}
                              className="font-semibold text-tinta hover:text-bola-600 truncate block hover:underline"
                            >
                              {atleta.nome}
                            </Link>
                            <span className="text-[11px] text-suave">
                              {vals.nome_preferido ? `"${vals.nome_preferido}"` : ""}
                              {vals.data_nascimento ? ` · Nasc: ${vals.data_nascimento}` : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Tipo / Função */}
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="inline-block rounded bg-cinza-100 px-2 py-0.5 text-[10px] font-semibold text-tinta">
                            {tipo}
                          </span>
                          {atleta.papel === "atleta" && (
                            !atleta.membros_equipa || atleta.membros_equipa.length === 0 ? (
                              <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                                Sem equipa
                              </span>
                            ) : (
                              <span className="inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-700">
                                {(atleta.membros_equipa as any[]).map((m: any) => m.equipas?.nome).filter(Boolean).join(", ")}
                              </span>
                            )
                          )}
                        </div>
                        <p className="text-[11px] text-suave mt-0.5 truncate max-w-[140px]">
                          {vals.funcao || atleta.posicao || "—"}
                        </p>
                      </td>

                      {secaoVisualizacao === "geral" && (
                        <>
                          <td className="px-3 py-3 text-suave">
                            {vals.contato || vals.email || "—"}
                          </td>
                          <td className="px-3 py-3 font-mono text-tinta">
                            {vals.cpf || "—"}
                          </td>
                          <td className="px-3 py-3 text-tinta">
                            {vals.passaporte_numero ? (
                              <span className="font-mono">
                                {vals.passaporte_numero}
                                {vals.passaporte_validade ? ` (${vals.passaporte_validade})` : ""}
                              </span>
                            ) : (
                              <span className="text-suave">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 font-semibold text-tinta">
                            {vals.camisa || "—"}
                          </td>
                          <td className="px-3 py-3 font-semibold text-tinta">
                            {vals.tenis || "—"}
                          </td>
                        </>
                      )}

                      {secaoVisualizacao === "documentos" && (
                        <>
                          <td className="px-3 py-3 font-mono text-tinta">{vals.cpf || "—"}</td>
                          <td className="px-3 py-3 font-mono text-tinta">
                            {vals.rg_numero ? `${vals.rg_numero} ${vals.rg_orgao_emissor || ""}` : "—"}
                          </td>
                          <td className="px-3 py-3 font-mono text-tinta">{vals.passaporte_numero || "—"}</td>
                          <td className="px-3 py-3 text-tinta">{vals.passaporte_validade || "—"}</td>
                          <td className="px-3 py-3 text-tinta">
                            {vals.visto_usa_validade ? (
                              <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 font-medium">
                                {vals.visto_usa_validade}
                              </span>
                            ) : (
                              <span className="text-suave">Não informado</span>
                            )}
                          </td>
                        </>
                      )}

                      {secaoVisualizacao === "uniformes" && (
                        <>
                          <td className="px-2 py-3 text-center font-medium">{vals.agasalho || "—"}</td>
                          <td className="px-2 py-3 text-center font-bold text-bola-600">{vals.camisa || "—"}</td>
                          <td className="px-2 py-3 text-center font-medium">{vals.bermuda_social || "—"}</td>
                          <td className="px-2 py-3 text-center font-medium">{vals.calca || "—"}</td>
                          <td className="px-2 py-3 text-center font-medium">{vals.short || "—"}</td>
                          <td className="px-2 py-3 text-center font-medium">{vals.chinelo || "—"}</td>
                          <td className="px-2 py-3 text-center font-bold text-quadra-700">{vals.tenis || "—"}</td>
                        </>
                      )}

                      {/* Botão de abrir ficha */}
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dados/${atleta.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-linha bg-white px-2.5 py-1 text-xs font-semibold text-tinta shadow-sm hover:bg-cinza-50"
                        >
                          Ficha
                          <ChevronRight className="h-3 w-3 text-suave" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
