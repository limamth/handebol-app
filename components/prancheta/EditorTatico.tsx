"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Quadra, FichaSvg, BolaSvg, SetaSvg } from "./Quadra";
import { QUADRA, type DadosTaticos, type Frame, type Seta } from "@/lib/prancheta";
import { salvarDiagrama } from "@/app/(app)/prancheta/actions";

const { comprimento: L, largura: W } = QUADRA;
const clamp = (v: number) => Math.min(1.05, Math.max(-0.05, v));
const botao = "rounded-md border border-linha bg-white px-3 py-2 text-sm hover:bg-fundo disabled:opacity-40";

type Arrasto = { tipo: "ficha"; id: string } | { tipo: "bola" } | null;
interface Props { id: string | null; tituloInicial: string; dadosIniciais: DadosTaticos; somenteLeitura: boolean }

export function EditorTatico({ id, tituloInicial, dadosIniciais, somenteLeitura }: Props) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const [titulo, setTitulo] = useState(tituloInicial);
  const [frames, setFrames] = useState<Frame[]>(dadosIniciais.frames);
  const [atual, setAtual] = useState(0);
  const [modo, setModo] = useState<"mover" | "seta">("mover");
  const [arrasto, setArrasto] = useState<Arrasto>(null);
  const [setaTemp, setSetaTemp] = useState<Seta | null>(null);
  const [tocando, setTocando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);

  const frame = frames[atual];
  const editavel = !somenteLeitura && !tocando;

  useEffect(() => {
    if (!tocando) return;
    if (atual >= frames.length - 1) { setTocando(false); return; }
    const t = setTimeout(() => setAtual(atual + 1), 1100);
    return () => clearTimeout(t);
  }, [tocando, atual, frames.length]);

  function ponto(e: React.PointerEvent) {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: clamp(p.x / L), y: clamp(p.y / W) };
  }

  const atualizar = (fn: (f: Frame) => Frame) => setFrames((fs) => fs.map((f, i) => (i === atual ? fn(f) : f)));

  function aoMover(e: React.PointerEvent) {
    if (setaTemp) { setSetaTemp({ ...setaTemp, para: ponto(e) }); return; }
    if (!arrasto) return;
    const p = ponto(e);
    if (arrasto.tipo === "bola") atualizar((f) => ({ ...f, bola: p }));
    else atualizar((f) => ({ ...f, jogadores: f.jogadores.map((j) => (j.id === arrasto.id ? { ...j, ...p } : j)) }));
  }

  function aoSoltar() {
    if (setaTemp) {
      const comprimento = Math.hypot((setaTemp.para.x - setaTemp.de.x) * L, (setaTemp.para.y - setaTemp.de.y) * W);
      if (comprimento > 0.8) atualizar((f) => ({ ...f, setas: [...f.setas, setaTemp] }));
      setSetaTemp(null);
    }
    setArrasto(null);
  }

  function aoPressionarFundo(e: React.PointerEvent<SVGSVGElement>) {
    if (!editavel || modo !== "seta") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = ponto(e);
    setSetaTemp({ de: p, para: p });
  }

  const iniciarArrasto = (a: Arrasto) => (e: React.PointerEvent<SVGGElement>) => {
    if (!editavel || modo !== "mover") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrasto(a);
  };

  function novoQuadro() {
    const copia: Frame = { ...JSON.parse(JSON.stringify(frame)), setas: [] };
    setFrames((fs) => [...fs.slice(0, atual + 1), copia, ...fs.slice(atual + 1)]);
    setAtual(atual + 1);
  }

  function excluirQuadro() {
    if (frames.length < 2) return;
    setFrames((fs) => fs.filter((_, i) => i !== atual));
    setAtual(Math.max(0, atual - 1));
  }

  function tocar() { if (atual >= frames.length - 1) setAtual(0); setTocando(true); }

  async function salvar() {
    setSalvando(true); setAviso(null);
    const r = await salvarDiagrama(id, titulo, { quadra: "praia", frames });
    setSalvando(false);
    if (!r.ok) { setAviso({ tipo: "erro", msg: r.erro }); return; }
    setAviso({ tipo: "ok", msg: "Jogada salva." });
    if (!id) router.replace(`/prancheta/${r.id}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-64 flex-1 text-sm font-medium">Nome da jogada
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} disabled={somenteLeitura} placeholder="Ex.: Entrada de pivô pelo lado esquerdo" className="mt-1 w-full rounded-md border border-linha bg-white px-3 py-2.5" />
        </label>
        {!somenteLeitura && (
          <button onClick={salvar} disabled={salvando || !titulo.trim()} className="rounded-md bg-bola-500 px-5 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-40">
            {salvando ? "Salvando..." : "Salvar jogada"}
          </button>
        )}
      </div>

      {aviso && <p role="status" className={`rounded-md px-3 py-2 text-sm ${aviso.tipo === "erro" ? "bg-bola-100" : "bg-emerald-100"}`}>{aviso.msg}</p>}

      <div className="rounded-lg border border-linha bg-white p-2">
        <Quadra svgRef={svgRef} style={{ touchAction: "none" }} className="w-full select-none" onPointerDown={aoPressionarFundo} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar}>
          {frame.setas.map((s, i) => <SetaSvg key={i} de={s.de} para={s.para} />)}
          {setaTemp && <SetaSvg de={setaTemp.de} para={setaTemp.para} />}
          {frame.jogadores.map((j) => (
            <FichaSvg key={j.id} x={j.x} y={j.y} time={j.time} rotulo={j.rotulo} animar={tocando}
              className={editavel && modo === "mover" ? "cursor-grab" : ""} onPointerDown={iniciarArrasto({ tipo: "ficha", id: j.id })} />
          ))}
          <BolaSvg x={frame.bola.x} y={frame.bola.y} animar={tocando} className={editavel && modo === "mover" ? "cursor-grab" : ""} onPointerDown={iniciarArrasto({ tipo: "bola" })} />
        </Quadra>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className={botao} onClick={() => setAtual(Math.max(0, atual - 1))} disabled={atual === 0 || tocando} aria-label="Quadro anterior">‹</button>
        <span className="px-2 text-sm" aria-live="polite">Quadro {atual + 1} de {frames.length}</span>
        <button className={botao} onClick={() => setAtual(Math.min(frames.length - 1, atual + 1))} disabled={atual >= frames.length - 1 || tocando} aria-label="Próximo quadro">›</button>
        {tocando
          ? <button className={botao} onClick={() => setTocando(false)}>Parar</button>
          : <button className={botao} onClick={tocar} disabled={frames.length < 2}>Reproduzir</button>}
        {!somenteLeitura && (
          <>
            <span className="mx-1 h-6 w-px bg-linha" aria-hidden />
            <button className={botao} onClick={novoQuadro} disabled={tocando}>Novo quadro</button>
            <button className={botao} onClick={excluirQuadro} disabled={tocando || frames.length < 2}>Excluir quadro</button>
            <span className="mx-1 h-6 w-px bg-linha" aria-hidden />
            <button className={`${botao} ${modo === "mover" ? "border-quadra-600 font-semibold" : ""}`} aria-pressed={modo === "mover"} onClick={() => setModo("mover")}>Mover</button>
            <button className={`${botao} ${modo === "seta" ? "border-quadra-600 font-semibold" : ""}`} aria-pressed={modo === "seta"} onClick={() => setModo("seta")}>Desenhar seta</button>
            <button className={botao} onClick={() => atualizar((f) => ({ ...f, setas: f.setas.slice(0, -1) }))} disabled={frame.setas.length === 0}>Desfazer seta</button>
          </>
        )}
      </div>

      <p className="max-w-3xl text-sm text-suave">
        Arraste as fichas e a bola. Para mostrar o movimento, use <strong>Novo quadro</strong> (copia as posições atuais) e mova as fichas: ao reproduzir, elas deslizam de um quadro para o outro.
        Azul é o ataque, laranja é a defesa, G é o goleiro.
      </p>
    </div>
  );
}
