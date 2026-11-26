"use client";

import { useState, useEffect } from "react";
import { Download, Film, Image as ImageIcon, X, CheckCircle2, Loader2 } from "lucide-react";
import type { Frame } from "@/lib/prancheta";
import { gerarGifPrancheta, gerarPngQuadro, baixarArquivo } from "@/lib/exportar-prancheta";

interface Props {
  titulo: string;
  frames: Frame[];
  quadroAtual: number;
  aberto: boolean;
  aoFechar: () => void;
}

export function ModalExportarPrancheta({
  titulo,
  frames,
  quadroAtual,
  aberto,
  aoFechar,
}: Props) {
  const [gerandoGif, setGerandoGif] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [gifBlob, setGifBlob] = useState<Blob | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [gerandoPng, setGerandoPng] = useState(false);

  useEffect(() => {
    return () => {
      if (gifUrl) URL.revokeObjectURL(gifUrl);
    };
  }, [gifUrl]);

  if (!aberto) return null;

  const nomeArquivoBase = (titulo.trim() || "jogada-handebol")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  async function handleGerarGif() {
    setGerandoGif(true);
    setProgresso(0);
    try {
      const blob = await gerarGifPrancheta(titulo, frames, (pct) => setProgresso(pct));
      setGifBlob(blob);
      if (gifUrl) URL.revokeObjectURL(gifUrl);
      const url = URL.createObjectURL(blob);
      setGifUrl(url);

      // Baixa automaticamente na primeira geração
      baixarArquivo(blob, `${nomeArquivoBase}-animacao.gif`);
    } catch (e: any) {
      alert("Falha ao gerar GIF: " + (e.message || "Erro desconhecido"));
    } finally {
      setGerandoGif(false);
    }
  }

  async function handleBaixarPng() {
    setGerandoPng(true);
    try {
      const blob = await gerarPngQuadro(
        frames[quadroAtual],
        titulo,
        quadroAtual,
        frames.length
      );
      baixarArquivo(blob, `${nomeArquivoBase}-quadro-${quadroAtual + 1}.png`);
    } catch (e: any) {
      alert("Falha ao exportar PNG: " + (e.message || "Erro"));
    } finally {
      setGerandoPng(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-linha bg-white p-5 shadow-2xl space-y-4">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-linha pb-3">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-bola-500" />
            <h2 className="font-titulo text-xl font-bold text-tinta">
              Exportar Jogada Tática
            </h2>
          </div>
          <button
            onClick={aoFechar}
            className="rounded-lg p-1.5 text-suave hover:bg-fundo hover:text-tinta"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Informações da jogada */}
        <div className="rounded-lg bg-fundo p-3 text-xs text-suave space-y-1">
          <p>
            <strong>Jogada:</strong> {titulo.trim() || "Sem título informado"}
          </p>
          <p>
            <strong>Cronologia:</strong> {frames.length} quadro(s) sequenciais cadastrados.
          </p>
        </div>

        {/* Preview do GIF se já gerado */}
        {gifUrl && (
          <div className="space-y-2">
            <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gifUrl}
                alt="Animação da jogada tática em loop"
                className="w-full h-auto object-contain"
              />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-md">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4" /> GIF animado gerado com sucesso!
              </span>
              <button
                onClick={() => gifBlob && baixarArquivo(gifBlob, `${nomeArquivoBase}-animacao.gif`)}
                className="font-bold underline hover:opacity-80"
              >
                Baixar novamente (.gif)
              </button>
            </div>
          </div>
        )}

        {/* Barra de Progresso quando gerando */}
        {gerandoGif && (
          <div className="space-y-2 py-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-quadra-900">
              <Loader2 className="h-4 w-4 animate-spin text-bola-500" />
              Renderizando animação em GIF ({progresso}%)...
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-bola-500 transition-all duration-150"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <p className="text-xs text-suave">
              Calculando movimentos dos jogadores, bola e transições contínuas...
            </p>
          </div>
        )}

        {/* Botões de Ação */}
        {!gerandoGif && (
          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            {/* Opção 1: GIF Animado */}
            <button
              type="button"
              onClick={handleGerarGif}
              className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-bola-500 bg-bola-500/10 p-4 text-center transition hover:bg-bola-500/20"
            >
              <div className="flex items-center gap-1.5 font-bold text-bola-600 text-sm">
                <Film className="h-4 w-4" />
                <span>{gifUrl ? "Regerar GIF Animado" : "Exportar em GIF Animado"}</span>
              </div>
              <span className="text-[11px] text-suave">
                Anima a sequência de todos os {frames.length} quadros em loop contínuo para WhatsApp
              </span>
            </button>

            {/* Opção 2: Imagem Estática do Quadro Atual */}
            <button
              type="button"
              disabled={gerandoPng}
              onClick={handleBaixarPng}
              className="flex flex-col items-center justify-center gap-1 rounded-xl border border-linha bg-white p-4 text-center transition hover:bg-fundo hover:border-quadra-600"
            >
              <div className="flex items-center gap-1.5 font-bold text-quadra-900 text-sm">
                <ImageIcon className="h-4 w-4" />
                <span>{gerandoPng ? "Exportando..." : `Baixar Quadro ${quadroAtual + 1} (PNG)`}</span>
              </div>
              <span className="text-[11px] text-suave">
                Foto estática com a posição atual dos jogadores e setas
              </span>
            </button>
          </div>
        )}

        {/* Dica para o usuário */}
        <p className="text-[11px] text-suave text-center">
          💡 <strong>Dica para o WhatsApp:</strong> O GIF animado é reconhecido e reproduzido automaticamente sem precisar de reprodutor de vídeo, facilitando o estudo dos atletas no grupo da equipe.
        </p>
      </div>
    </div>
  );
}
