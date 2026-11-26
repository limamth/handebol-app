"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Trash2, Eye, X } from "lucide-react";

interface UploadFotoCampoProps {
  chave: string;
  rotulo: string;
  fotoAtual?: string | null;
  desabilitado?: boolean;
}

export function UploadFotoCampo({ chave, rotulo, fotoAtual, desabilitado = false }: UploadFotoCampoProps) {
  const [foto, setFoto] = useState<string | null>(fotoAtual ?? null);
  const [remover, setRemover] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processarArquivo = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione um arquivo de imagem válido (JPG, PNG, WEBP).");
      return;
    }

    setCarregando(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Redimensiona para no máximo 1200px para manter leve e alta qualidade
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          // Exporta em JPEG de boa qualidade (~85%)
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setFoto(compressedDataUrl);
          setRemover(false);
        }
        setCarregando(false);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processarArquivo(file);
    }
  };

  const handleRemover = () => {
    setFoto(null);
    setRemover(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="mt-2 rounded-lg border border-dashed border-linha bg-fundo p-3">
      {/* Inputs ocultos para submissão no FormData */}
      <input type="hidden" name={`foto_${chave}`} value={foto && !remover ? foto : ""} />
      <input type="hidden" name={`remover_foto_${chave}`} value={remover ? "1" : "0"} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={desabilitado}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {foto && !remover ? (
            <div className="relative group h-14 w-14 flex-shrink-0 overflow-hidden rounded-md border border-linha bg-black/5">
              <img src={foto} alt={rotulo} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setModalAberto(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100"
                title="Ampliar foto"
              >
                <Eye className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md border border-linha bg-white text-suave">
              <Camera className="h-6 w-6" />
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-tinta">Foto / Imagem: {rotulo}</p>
            <p className="text-[11px] text-suave">
              {foto && !remover ? "Foto anexada (clique para ampliar)" : "Nenhuma foto anexada"}
            </p>
          </div>
        </div>

        {!desabilitado && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={carregando}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-linha bg-white px-2.5 py-1.5 text-xs font-medium text-tinta shadow-sm hover:bg-cinza-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {carregando ? "Carregando..." : foto && !remover ? "Trocar foto" : "Anexar foto"}
            </button>

            {foto && !remover && (
              <button
                type="button"
                onClick={handleRemover}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                title="Remover foto"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remover
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal para visualização ampliada da foto */}
      {modalAberto && foto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setModalAberto(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-lg bg-white p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between px-2 pt-1">
              <h4 className="font-titulo text-base font-bold text-tinta">{rotulo}</h4>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="rounded-full p-1 text-suave hover:bg-cinza-100 hover:text-tinta"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto rounded bg-black/5 p-1 flex items-center justify-center">
              <img src={foto} alt={rotulo} className="max-h-[70vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
