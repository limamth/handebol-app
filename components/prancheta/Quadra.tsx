import type { Ref, SVGProps } from "react";
import { QUADRA, type Frame, type Lado } from "@/lib/prancheta";

const { comprimento: L, largura: W, margem: M, areaGol, golLargura } = QUADRA;
export const COR: Record<Lado, string> = { ataque: "#2F5496", defesa: "#F26A1B" };
const AZUL_LINHA = "#1D4ED8";

type PropsQuadra = SVGProps<SVGSVGElement> & { svgRef?: Ref<SVGSVGElement> };

// Quadra de handebol de praia: 27 m x 12 m, áreas do gol de 6 m nas pontas e 15 m no centro.
export function Quadra({ children, svgRef, ...resto }: PropsQuadra) {
  const yGol = (W - golLargura) / 2;
  return (
    <svg ref={svgRef} viewBox={`${-M} ${-M} ${L + 2 * M} ${W + 2 * M}`} role="img" aria-label="Quadra de handebol de praia" {...resto}>
      <defs>
        <marker id="ponta" viewBox="0 0 4 4" refX="3" refY="2" markerWidth="4" markerHeight="4" orient="auto">
          <path d="M0,0 L4,2 L0,4 z" fill="#18202E" />
        </marker>
      </defs>
      <rect x={-M} y={-M} width={L + 2 * M} height={W + 2 * M} fill="#F6E7C1" />
      <rect x={0} y={0} width={L} height={W} fill="#EBD3A0" stroke={AZUL_LINHA} strokeWidth={0.12} />
      <line x1={areaGol} y1={0} x2={areaGol} y2={W} stroke={AZUL_LINHA} strokeWidth={0.1} />
      <line x1={L - areaGol} y1={0} x2={L - areaGol} y2={W} stroke={AZUL_LINHA} strokeWidth={0.1} />
      <rect x={-0.6} y={yGol} width={0.6} height={golLargura} fill="#8C8456" />
      <rect x={L} y={yGol} width={0.6} height={golLargura} fill="#8C8456" />
      {children}
    </svg>
  );
}

type PropsFicha = SVGProps<SVGGElement> & { x: number; y: number; time: Lado; rotulo: string; animar?: boolean };

export function FichaSvg({ x, y, time, rotulo, animar, ...resto }: PropsFicha) {
  return (
    <g {...resto} style={{ transform: `translate(${x * L}px, ${y * W}px)`, transition: animar ? "transform 1s linear" : "none" }}>
      <circle r={0.6} fill={COR[time]} stroke="#fff" strokeWidth={0.12} />
      <text textAnchor="middle" dy="0.25" fontSize={0.65} fontWeight={700} fill="#fff" fontFamily="sans-serif" pointerEvents="none">{rotulo}</text>
    </g>
  );
}

type PropsBola = SVGProps<SVGGElement> & { x: number; y: number; animar?: boolean };

export function BolaSvg({ x, y, animar, ...resto }: PropsBola) {
  return (
    <g {...resto} style={{ transform: `translate(${x * L}px, ${y * W}px)`, transition: animar ? "transform 1s linear" : "none" }}>
      <circle r={0.34} fill="#fff" stroke="#18202E" strokeWidth={0.1} />
    </g>
  );
}

export function SetaSvg({ de, para }: { de: { x: number; y: number }; para: { x: number; y: number } }) {
  return <line x1={de.x * L} y1={de.y * W} x2={para.x * L} y2={para.y * W} stroke="#18202E" strokeWidth={0.15} markerEnd="url(#ponta)" />;
}

// Versão só para exibir (miniaturas e detalhes)
export function QuadraEstatica({ frame, className }: { frame: Frame; className?: string }) {
  return (
    <Quadra className={className ?? "w-full rounded-md"}>
      {frame.setas.map((s, i) => <SetaSvg key={i} de={s.de} para={s.para} />)}
      {frame.jogadores.map((j) => <FichaSvg key={j.id} x={j.x} y={j.y} time={j.time} rotulo={j.rotulo} />)}
      <BolaSvg x={frame.bola.x} y={frame.bola.y} />
    </Quadra>
  );
}
