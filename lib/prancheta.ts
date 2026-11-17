// Medidas da quadra de handebol de praia, em metros (conforme a foto enviada).
export const QUADRA = { comprimento: 27, largura: 12, margem: 1.5, areaGol: 6, golLargura: 3 };

export type Lado = "ataque" | "defesa";
export interface Ponto { x: number; y: number }                       // 0 a 1 dentro da quadra
export interface Ficha extends Ponto { id: string; time: Lado; rotulo: string }
export interface Seta { de: Ponto; para: Ponto }
export interface Frame { jogadores: Ficha[]; bola: Ponto; setas: Seta[] }
export interface DadosTaticos { quadra: "praia"; frames: Frame[] }

// Quatro atletas por equipa: o ataque (azul) joga para a direita.
export function frameInicial(): Frame {
  return {
    jogadores: [
      { id: "A1", x: 0.62, y: 0.25, time: "ataque", rotulo: "1" },
      { id: "A2", x: 0.66, y: 0.5, time: "ataque", rotulo: "2" },
      { id: "A3", x: 0.62, y: 0.75, time: "ataque", rotulo: "3" },
      { id: "AG", x: 0.03, y: 0.5, time: "ataque", rotulo: "G" },
      { id: "D1", x: 0.82, y: 0.3, time: "defesa", rotulo: "1" },
      { id: "D2", x: 0.82, y: 0.5, time: "defesa", rotulo: "2" },
      { id: "D3", x: 0.82, y: 0.7, time: "defesa", rotulo: "3" },
      { id: "DG", x: 0.97, y: 0.5, time: "defesa", rotulo: "G" },
    ],
    bola: { x: 0.71, y: 0.5 },
    setas: [],
  };
}

export const dadosIniciais = (): DadosTaticos => ({ quadra: "praia", frames: [frameInicial()] });
