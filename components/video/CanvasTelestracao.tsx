"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, Circle, Pencil, Type, Undo2, Trash2, Check, X, Play } from "lucide-react";
import type { FormaTelestracao, TipoFormaTelestracao } from "@/lib/video-tagging";

interface CanvasTelestracaoProps {
  formas: FormaTelestracao[];
  editavel: boolean;
  onSalvar?: (formas: FormaTelestracao[]) => void;
  onCancelar?: () => void;
  onContinuarVideo?: () => void;
}

const CORES = ["#f97316", "#eab308", "#22c55e", "#3b82f6", "#ef4444", "#ffffff"];

export function CanvasTelestracao({
  formas: formasIniciais,
  editavel,
  onSalvar,
  onCancelar,
  onContinuarVideo,
}: CanvasTelestracaoProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [formas, setFormas] = useState<FormaTelestracao[]>(formasIniciais);
  const [ferramenta, setFerramenta] = useState<TipoFormaTelestracao>("seta");
  const [cor, setCor] = useState("#f97316");
  const [desenhando, setDesenhando] = useState<FormaTelestracao | null>(null);

  const obterPonto = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!editavel) return;
    const pt = obterPonto(e);

    if (ferramenta === "texto") {
      const texto = prompt("Digite a anotação tática para este ponto:");
      if (texto && texto.trim()) {
        setFormas((prev) => [
          ...prev,
          { id: `f_${Date.now()}`, tipo: "texto", cor, x1: pt.x, y1: pt.y, texto: texto.trim() },
        ]);
      }
      return;
    }

    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDesenhando({
      id: `f_${Date.now()}`,
      tipo: ferramenta,
      cor,
      x1: pt.x,
      y1: pt.y,
      x2: pt.x,
      y2: pt.y,
      pontos: ferramenta === "linha" ? [pt] : undefined,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!editavel || !desenhando) return;
    const pt = obterPonto(e);

    if (desenhando.tipo === "linha") {
      setDesenhando((prev) =>
        prev ? { ...prev, pontos: [...(prev.pontos ?? []), pt] } : null
      );
    } else {
      setDesenhando((prev) => (prev ? { ...prev, x2: pt.x, y2: pt.y } : null));
    }
  };

  const handlePointerUp = () => {
    if (!editavel || !desenhando) return;
    setFormas((prev) => [...prev, desenhando]);
    setDesenhando(null);
  };

  const renderForma = (f: FormaTelestracao) => {
    if (f.tipo === "seta" && f.x2 !== undefined && f.y2 !== undefined) {
      const markerId = `arrow-${f.cor.replace("#", "")}`;
      return (
        <g key={f.id}>
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill={f.cor} />
            </marker>
          </defs>
          <line
            x1={f.x1}
            y1={f.y1}
            x2={f.x2}
            y2={f.y2}
            stroke={f.cor}
            strokeWidth="0.9"
            strokeLinecap="round"
            markerEnd={`url(#${markerId})`}
          />
        </g>
      );
    }

    if (f.tipo === "circulo" && f.x2 !== undefined && f.y2 !== undefined) {
      const r = Math.hypot(f.x2 - f.x1, f.y2 - f.y1);
      return (
        <circle
          key={f.id}
          cx={f.x1}
          cy={f.y1}
          r={Math.max(1, r)}
          fill="none"
          stroke={f.cor}
          strokeWidth="0.8"
        />
      );
    }

    if (f.tipo === "linha" && f.pontos && f.pontos.length > 1) {
      const d = f.pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
      return (
        <path
          key={f.id}
          d={d}
          fill="none"
          stroke={f.cor}
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }

    if (f.tipo === "texto" && f.texto) {
      return (
        <g key={f.id}>
          <text
            x={f.x1}
            y={f.y1}
            fill={f.cor}
            fontSize="3.4"
            fontWeight="bold"
            stroke="#000"
            strokeWidth="0.25"
            paintOrder="stroke"
          >
            {f.texto}
          </text>
        </g>
      );
    }

    return null;
  };

  const todasFormas = desenhando ? [...formas, desenhando] : formas;

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none">
      {/* Barra de Ferramentas (quando editável) */}
      {editavel && (
        <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 px-3 py-2 text-xs text-white backdrop-blur">
          <div className="flex items-center gap-1">
            {[
              { k: "seta", icon: ArrowUpRight, label: "Seta" },
              { k: "circulo", icon: Circle, label: "Círculo" },
              { k: "linha", icon: Pencil, label: "Livre" },
              { k: "texto", icon: Type, label: "Texto" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.k}
                  type="button"
                  onClick={() => setFerramenta(item.k as TipoFormaTelestracao)}
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 font-semibold ${
                    ferramenta === item.k ? "bg-bola-500 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}

            <div className="mx-1 h-4 w-px bg-slate-700" />

            {CORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCor(c)}
                style={{ backgroundColor: c }}
                className={`h-5 w-5 rounded-full border-2 ${
                  cor === c ? "border-white scale-110" : "border-transparent opacity-80"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFormas((prev) => prev.slice(0, -1))}
              className="rounded bg-slate-800 p-1.5 hover:bg-slate-700"
              title="Desfazer último traço"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setFormas([])}
              className="rounded bg-slate-800 p-1.5 hover:bg-slate-700"
              title="Limpar tudo"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onCancelar}
              className="inline-flex items-center gap-1 rounded bg-slate-700 px-2.5 py-1 font-semibold hover:bg-slate-600"
            >
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
            <button
              type="button"
              onClick={() => onSalvar?.(formas)}
              className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 font-semibold text-white hover:bg-emerald-700"
            >
              <Check className="h-3.5 w-3.5" /> Salvar Desenho
            </button>
          </div>
        </div>
      )}

      {/* Área SVG de Desenho */}
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`h-full w-full flex-1 ${editavel ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"}`}
      >
        {todasFormas.map(renderForma)}
      </svg>

      {/* Botão flutuante para continuar o vídeo após visualizar telestração */}
      {!editavel && onContinuarVideo && (
        <div className="pointer-events-auto flex justify-center pb-4">
          <button
            type="button"
            onClick={onContinuarVideo}
            className="inline-flex items-center gap-1.5 rounded-full bg-bola-500 px-4 py-2 text-xs font-bold text-white shadow-lg hover:opacity-90"
          >
            <Play className="h-3.5 w-3.5" />
            Continuar Vídeo
          </button>
        </div>
      )}
    </div>
  );
}
