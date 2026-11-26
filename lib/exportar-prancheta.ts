import { QUADRA, type Frame, type Ficha, type Ponto } from "./prancheta";
import { GifEncoder } from "./gif";

const { comprimento: L, largura: W, margem: M, areaGol, golLargura } = QUADRA;

// Dimensões do canvas exportado (proporção 2:1 da quadra oficial 30m x 15m com margens)
const CANVAS_W = 640;
const CANVAS_H = 320;
const ESCALA = CANVAS_W / (L + 2 * M); // ~21.33 px por metro

export function renderizarQuadroCanvas(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  titulo: string,
  indiceQuadro: number,
  totalQuadros: number
) {
  // 1. Limpa e desenha área externa de areia
  ctx.fillStyle = "#F6E7C1";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // 2. Área interna da quadra (27m x 12m)
  const quadraX = M * ESCALA;
  const quadraY = M * ESCALA;
  const quadraW = L * ESCALA;
  const quadraH = W * ESCALA;

  ctx.fillStyle = "#EBD3A0";
  ctx.fillRect(quadraX, quadraY, quadraW, quadraH);

  // Linhas perimetrais da quadra
  ctx.strokeStyle = "#1D4ED8";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(quadraX, quadraY, quadraW, quadraH);

  // 3. Linhas da área de gol (6 metros em cada ponta)
  const linhaGolEsqX = (M + areaGol) * ESCALA;
  const linhaGolDirX = (M + L - areaGol) * ESCALA;

  ctx.beginPath();
  ctx.moveTo(linhaGolEsqX, quadraY);
  ctx.lineTo(linhaGolEsqX, quadraY + quadraH);
  ctx.moveTo(linhaGolDirX, quadraY);
  ctx.lineTo(linhaGolDirX, quadraY + quadraH);
  ctx.stroke();

  // 4. Balizas (3 metros de largura centralizada nas extremidades)
  const balizaY = (M + (W - golLargura) / 2) * ESCALA;
  const balizaH = golLargura * ESCALA;
  const balizaProfundidade = 0.6 * ESCALA;

  ctx.fillStyle = "#8C8456";
  // Baliza esquerda
  ctx.fillRect(quadraX - balizaProfundidade, balizaY, balizaProfundidade, balizaH);
  ctx.strokeRect(quadraX - balizaProfundidade, balizaY, balizaProfundidade, balizaH);
  // Baliza direita
  ctx.fillRect(quadraX + quadraW, balizaY, balizaProfundidade, balizaH);
  ctx.strokeRect(quadraX + quadraW, balizaY, balizaProfundidade, balizaH);

  // 5. Desenha Setas táticas
  for (const s of frame.setas) {
    const deX = (M + s.de.x * L) * ESCALA;
    const deY = (M + s.de.y * W) * ESCALA;
    const paraX = (M + s.para.x * L) * ESCALA;
    const paraY = (M + s.para.y * W) * ESCALA;

    ctx.strokeStyle = "#18202E";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(deX, deY);
    ctx.lineTo(paraX, paraY);
    ctx.stroke();

    // Ponta da seta
    const angulo = Math.atan2(paraY - deY, paraX - deX);
    const tamPonta = 10;
    ctx.fillStyle = "#18202E";
    ctx.beginPath();
    ctx.moveTo(paraX, paraY);
    ctx.lineTo(
      paraX - tamPonta * Math.cos(angulo - Math.PI / 6),
      paraY - tamPonta * Math.sin(angulo - Math.PI / 6)
    );
    ctx.lineTo(
      paraX - tamPonta * Math.cos(angulo + Math.PI / 6),
      paraY - tamPonta * Math.sin(angulo + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }

  // 6. Desenha Fichas dos Jogadores
  const raioJogador = 0.6 * ESCALA; // 0.6m raio

  for (const j of frame.jogadores) {
    const jX = (M + j.x * L) * ESCALA;
    const jY = (M + j.y * W) * ESCALA;

    // Círculo com cor do time
    ctx.beginPath();
    ctx.arc(jX, jY, raioJogador, 0, Math.PI * 2);
    ctx.fillStyle = j.time === "ataque" ? "#2F5496" : "#F26A1B";
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Rótulo / Número do jogador
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${Math.round(raioJogador * 1.1)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(j.rotulo, jX, jY + 1);
  }

  // 7. Desenha a Bola
  const raioBola = 0.35 * ESCALA;
  const bX = (M + frame.bola.x * L) * ESCALA;
  const bY = (M + frame.bola.y * W) * ESCALA;

  ctx.beginPath();
  ctx.arc(bX, bY, raioBola, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.strokeStyle = "#18202E";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 8. Cabeçalho / Rodapé informativo
  // Badge de quadro no topo
  ctx.fillStyle = "rgba(20, 40, 75, 0.85)";
  ctx.beginPath();
  ctx.roundRect?.(12, 10, 110, 26, 6) ?? ctx.rect(12, 10, 110, 26);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`Quadro ${indiceQuadro + 1} de ${totalQuadros}`, 67, 23);

  // Nome da jogada no rodapé
  if (titulo.trim()) {
    ctx.fillStyle = "rgba(24, 32, 46, 0.75)";
    const larguraTexto = Math.min(CANVAS_W - 24, ctx.measureText(titulo).width + 24);
    ctx.beginPath();
    ctx.roundRect?.(12, CANVAS_H - 34, larguraTexto, 24, 6) ?? ctx.rect(12, CANVAS_H - 34, larguraTexto, 24);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "500 12px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(titulo, 24, CANVAS_H - 22);
  }
}

// Interpolação suave entre dois frames (para criar o movimento contínuo no GIF)
function interpolarFrame(f1: Frame, f2: Frame, t: number): Frame {
  // t varia de 0 a 1
  const jogadores: Ficha[] = f1.jogadores.map((j1) => {
    const j2 = f2.jogadores.find((x) => x.id === j1.id);
    if (!j2) return j1;
    return {
      ...j1,
      x: j1.x + (j2.x - j1.x) * t,
      y: j1.y + (j2.y - j1.y) * t,
    };
  });

  const bola: Ponto = {
    x: f1.bola.x + (f2.bola.x - f1.bola.x) * t,
    y: f1.bola.y + (f2.bola.y - f1.bola.y) * t,
  };

  return {
    jogadores,
    bola,
    setas: t < 0.5 ? f1.setas : f2.setas,
  };
}

export async function gerarGifPrancheta(
  titulo: string,
  frames: Frame[],
  onProgresso?: (pct: number) => void
): Promise<Blob> {
  if (typeof window === "undefined") throw new Error("Apenas no navegador.");

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  const encoder = new GifEncoder(CANVAS_W, CANVAS_H);
  const total = frames.length;

  if (total === 1) {
    // Apenas 1 quadro: gera GIF estático com pausa de 2 segundos
    renderizarQuadroCanvas(ctx, frames[0], titulo, 0, 1);
    const imgData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    encoder.adicionarQuadro(imgData.data, 200);
    return encoder.gerarBlob();
  }

  // Número de subquadros interpolados entre cada etapa para movimento fluído
  const SUBQUADROS = 6;
  const totalEtapas = (total - 1) * (SUBQUADROS + 1) + 1;
  let etapasProcessadas = 0;

  for (let i = 0; i < total; i++) {
    // 1. Quadro chave principal (pausa de 1,2s para visualização da tática)
    renderizarQuadroCanvas(ctx, frames[i], titulo, i, total);
    let imgData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    // Último quadro tem pausa maior (1,8s) antes de reiniciar o loop
    const delayChave = i === total - 1 ? 180 : 120;
    encoder.adicionarQuadro(imgData.data, delayChave);

    etapasProcessadas++;
    onProgresso?.(Math.round((etapasProcessadas / totalEtapas) * 100));

    // 2. Se houver próximo quadro, gera os subquadros de transição deslizante
    if (i < total - 1) {
      const fAtual = frames[i];
      const fProx = frames[i + 1];

      for (let s = 1; s <= SUBQUADROS; s++) {
        const t = s / (SUBQUADROS + 1);
        const frameInterp = interpolarFrame(fAtual, fProx, t);

        renderizarQuadroCanvas(ctx, frameInterp, titulo, i, total);
        imgData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
        // 8 centisegundos = 80ms (~12 FPS de transição suave)
        encoder.adicionarQuadro(imgData.data, 8);

        etapasProcessadas++;
        onProgresso?.(Math.round((etapasProcessadas / totalEtapas) * 100));

        // Pequeno yield para o loop de eventos não travar o navegador
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  }

  return encoder.gerarBlob();
}

export function gerarPngQuadro(
  frame: Frame,
  titulo: string,
  indiceQuadro: number,
  totalQuadros: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d")!;

    renderizarQuadroCanvas(ctx, frame, titulo, indiceQuadro, totalQuadros);
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Falha ao exportar PNG."));
    }, "image/png");
  });
}

export function baixarArquivo(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
