"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  Phone,
  FileText,
  Plane,
  Shirt,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowLeft,
  ShieldCheck,
  Clock,
} from "lucide-react";
import {
  CATEGORIAS_CAMPOS,
  type CampoCadastro,
  type CategoriaCampo,
  type RegistroCadastral,
} from "@/lib/dados-atletas";
import { UploadFotoCampo } from "./UploadFotoCampo";
import { salvarDadosAtleta } from "@/app/(app)/dados/actions";

interface FormularioDadosAtletaProps {
  atleta: {
    id: string;
    nome: string;
    papel: string;
    ativo?: boolean;
    posicao?: string | null;
    ano_nascimento?: number | null;
  };
  campos: CampoCadastro[];
  registro: RegistroCadastral | null;
  podeGerir: boolean;
  voltarHref?: string;
}

const ICONE_CATEGORIA: Record<CategoriaCampo, React.ComponentType<{ className?: string }>> = {
  pessoal: User,
  contato_endereco: Phone,
  documentos: FileText,
  passaporte_viagem: Plane,
  uniformes: Shirt,
  outros: Sparkles,
};

export function FormularioDadosAtleta({
  atleta,
  campos,
  registro,
  podeGerir,
  voltarHref = "/dados",
}: FormularioDadosAtletaProps) {
  const valores = registro?.valores ?? {};
  const fotos = registro?.fotos ?? {};
  const [checado, setChecado] = useState(registro?.checado ?? false);
  const [salvando, setSalvando] = useState(false);
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaCampo | "todas">("todas");

  // Agrupa campos por categoria
  const camposPorCategoria = CATEGORIAS_CAMPOS.map((cat) => ({
    ...cat,
    campos: campos.filter((c) => c.categoria === cat.chave),
  })).filter((cat) => cat.campos.length > 0);

  // Calcula preenchimento de campos
  const totalCampos = campos.length;
  const preenchidos = campos.filter((c) => {
    const val = valores[c.chave];
    const temFoto = !!fotos[c.chave];
    return (val !== undefined && val !== null && String(val).trim() !== "") || temFoto;
  }).length;
  const percentual = totalCampos > 0 ? Math.round((preenchidos / totalCampos) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Barra superior de navegação e status */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={voltarHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-suave hover:text-tinta"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a lista de dados
        </Link>

        <div className="flex items-center gap-3">
          {registro?.checado ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Checado / Aprovado (OK)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              <Clock className="h-3.5 w-3.5" />
              Pendente de Checagem
            </span>
          )}

          <span className="text-xs font-medium text-suave">
            {preenchidos} de {totalCampos} campos preenchidos ({percentual}%)
          </span>
        </div>
      </div>

      {/* Cartão de cabeçalho do Atleta / Oficial */}
      <div className="rounded-xl border border-linha bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {fotos["foto_perfil"] ? (
            <img
              src={fotos["foto_perfil"]}
              alt={atleta.nome}
              className="h-16 w-16 rounded-full object-cover border-2 border-bola-500 shadow-sm"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-quadra-900 font-titulo text-2xl font-bold text-white shadow-sm">
              {atleta.nome
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
          )}

          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2">
              <h2 className="font-titulo text-2xl font-bold text-tinta">{atleta.nome}</h2>
              <span className="rounded bg-cinza-100 px-2 py-0.5 text-xs font-medium text-suave capitalize">
                {valores.tipo_cadastro || (atleta.papel === "atleta" ? "Atleta" : "Oficial")}
              </span>
            </div>
            <p className="text-sm text-suave">
              {valores.funcao || atleta.posicao || "Função não informada"}
              {valores.contato ? ` · ${valores.contato}` : ""}
              {valores.email ? ` · ${valores.email}` : ""}
            </p>
          </div>

          <div className="w-full sm:w-48">
            <div className="flex justify-between text-xs font-medium text-suave mb-1">
              <span>Completude</span>
              <span>{percentual}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-cinza-100">
              <div
                className={`h-full transition-all duration-300 ${
                  percentual >= 80 ? "bg-emerald-500" : percentual >= 50 ? "bg-bola-500" : "bg-amber-500"
                }`}
                style={{ width: `${percentual}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navegação por categorias */}
      <div className="flex flex-wrap gap-2 border-b border-linha pb-2">
        <button
          type="button"
          onClick={() => setCategoriaAtiva("todas")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            categoriaAtiva === "todas"
              ? "bg-bola-500 text-white shadow-sm"
              : "bg-white text-suave hover:bg-cinza-50 hover:text-tinta border border-linha"
          }`}
        >
          Todas as Categorias
        </button>

        {camposPorCategoria.map((cat) => {
          const Icone = ICONE_CATEGORIA[cat.chave] || Sparkles;
          const preenchidosCat = cat.campos.filter((c) => valores[c.chave] || fotos[c.chave]).length;
          return (
            <button
              key={cat.chave}
              type="button"
              onClick={() => setCategoriaAtiva(cat.chave)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                categoriaAtiva === cat.chave
                  ? "bg-bola-500 text-white shadow-sm"
                  : "bg-white text-suave hover:bg-cinza-50 hover:text-tinta border border-linha"
              }`}
            >
              <Icone className="h-3.5 w-3.5" />
              {cat.rotulo}
              <span
                className={`ml-1 rounded px-1 text-[10px] ${
                  categoriaAtiva === cat.chave ? "bg-white/20 text-white" : "bg-cinza-100 text-suave"
                }`}
              >
                {preenchidosCat}/{cat.campos.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Formulário principal */}
      <form
        action={salvarDadosAtleta.bind(null, atleta.id)}
        onSubmit={() => setSalvando(true)}
        className="space-y-6"
      >
        <input type="hidden" name="atleta_id" value={atleta.id} />

        {camposPorCategoria.map((cat) => {
          if (categoriaAtiva !== "todas" && categoriaAtiva !== cat.chave) return null;
          const Icone = ICONE_CATEGORIA[cat.chave] || Sparkles;

          return (
            <section
              key={cat.chave}
              className="rounded-xl border border-linha bg-white p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-linha pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bola-100 text-bola-600">
                    <Icone className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-titulo text-base font-bold text-tinta">{cat.rotulo}</h3>
                    <p className="text-xs text-suave">{cat.descricao}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cat.campos.map((campo) => {
                  const valorAtual = valores[campo.chave] ?? "";
                  const fotoAtual = fotos[campo.chave] ?? null;

                  return (
                    <div
                      key={campo.chave}
                      className={campo.permite_foto ? "sm:col-span-2 lg:col-span-3 rounded-lg border border-cinza-200 bg-cinza-50/50 p-3" : ""}
                    >
                      <label className="block text-xs font-semibold text-tinta">
                        {campo.rotulo}
                        {campo.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                      </label>

                      {/* Campo conforme o tipo */}
                      {campo.tipo === "selecao" ? (
                        <select
                          name={campo.chave}
                          defaultValue={valorAtual}
                          required={campo.obrigatorio}
                          className="mt-1 w-full rounded-md border border-linha bg-white px-3 py-2 text-sm text-tinta focus:border-bola-500 focus:outline-none"
                        >
                          <option value="">Selecione...</option>
                          {(campo.opcoes ?? []).map((op) => (
                            <option key={op} value={op}>
                              {op}
                            </option>
                          ))}
                        </select>
                      ) : campo.tipo === "data" ? (
                        <input
                          type="date"
                          name={campo.chave}
                          defaultValue={valorAtual}
                          required={campo.obrigatorio}
                          className="mt-1 w-full rounded-md border border-linha bg-white px-3 py-2 text-sm text-tinta focus:border-bola-500 focus:outline-none"
                        />
                      ) : campo.tipo === "numero" ? (
                        <input
                          type="number"
                          step="any"
                          name={campo.chave}
                          defaultValue={valorAtual}
                          required={campo.obrigatorio}
                          className="mt-1 w-full rounded-md border border-linha bg-white px-3 py-2 text-sm text-tinta focus:border-bola-500 focus:outline-none"
                        />
                      ) : (
                        <input
                          type="text"
                          name={campo.chave}
                          defaultValue={valorAtual}
                          required={campo.obrigatorio}
                          className="mt-1 w-full rounded-md border border-linha bg-white px-3 py-2 text-sm text-tinta focus:border-bola-500 focus:outline-none"
                        />
                      )}

                      {/* Upload de foto opcional do campo */}
                      {campo.permite_foto && (
                        <UploadFotoCampo
                          chave={campo.chave}
                          rotulo={campo.rotulo}
                          fotoAtual={fotoAtual}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Bloco de Checagem pela comissão técnica */}
        {podeGerir && (
          <div className="rounded-xl border border-linha bg-white p-5 shadow-sm">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="checado"
                value="1"
                checked={checado}
                onChange={(e) => setChecado(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-linha text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="font-titulo text-base font-bold text-tinta flex items-center gap-1.5">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  CHECADO? (Dados cadastrais conferidos e validados pela comissão técnica)
                </span>
                <p className="text-xs text-suave mt-0.5">
                  Ao marcar como checado, o atleta exibirá o selo verde de aprovação ("OK") nas listagens, relatórios e viagens da equipe.
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Barra de ação inferior */}
        <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-xl border border-linha bg-white/95 p-4 shadow-lg backdrop-blur">
          <Link
            href={voltarHref}
            className="rounded-md border border-linha bg-white px-4 py-2 text-sm font-medium text-suave hover:bg-cinza-50"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={salvando}
            className="inline-flex items-center gap-2 rounded-lg bg-bola-500 px-6 py-2.5 font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {salvando ? "Salvando dados..." : "Salvar Dados Cadastrais"}
          </button>
        </div>
      </form>
    </div>
  );
}
