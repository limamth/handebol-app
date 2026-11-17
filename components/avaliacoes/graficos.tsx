const br = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");
const dataCurta = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

// Barras horizontais: último resultado de cada atleta, com a média do grupo em destaque
export function GraficoBarras({ dados, media, unidade }: { dados: { nome: string; valor: number }[]; media: number; unidade: string }) {
  const linha = 28, largura = 640, esquerda = 160, areaW = largura - esquerda - 80;
  const max = Math.max(...dados.map((d) => d.valor), media, 1);
  const x = (v: number) => esquerda + (v / max) * areaW;
  const altura = dados.length * linha + 34;
  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={`Último resultado de cada atleta em ${unidade}. Média do grupo: ${br(media)}.`} className="w-full">
      {dados.map((d, i) => (
        <g key={i}>
          <text x={esquerda - 8} y={i * linha + 19} textAnchor="end" className="fill-tinta text-[12px]">{d.nome.length > 22 ? `${d.nome.slice(0, 21)}…` : d.nome}</text>
          <rect x={esquerda} y={i * linha + 6} width={Math.max(2, x(d.valor) - esquerda)} height={16} rx={2} className="fill-quadra-600" />
          <text x={x(d.valor) + 6} y={i * linha + 19} className="fill-tinta text-[12px]">{br(d.valor)}</text>
        </g>
      ))}
      <line x1={x(media)} y1={0} x2={x(media)} y2={dados.length * linha} strokeWidth={2} strokeDasharray="5 4" className="stroke-bola-500" />
      <text x={x(media)} y={altura - 8} textAnchor="middle" className="fill-tinta text-[12px]">Média do grupo: {br(media)} {unidade}</text>
    </svg>
  );
}

// Linha: média dos atletas avaliados em cada data
export function GraficoEvolucao({ pontos, unidade }: { pontos: { data: string; valor: number; n: number }[]; unidade: string }) {
  const L = 640, H = 240, ml = 56, mr = 24, mt = 16, mb = 38;
  const vals = pontos.map((p) => p.valor);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min -= 1; max += 1; }
  const folga = (max - min) * 0.15;
  min -= folga; max += folga;
  const x = (i: number) => (pontos.length === 1 ? ml + (L - ml - mr) / 2 : ml + (i * (L - ml - mr)) / (pontos.length - 1));
  const y = (v: number) => mt + (1 - (v - min) / (max - min)) * (H - mt - mb);
  const ticks = [0, 1, 2, 3].map((i) => min + ((max - min) * i) / 3);
  const passo = pontos.length > 8 ? 2 : 1;
  return (
    <svg viewBox={`0 0 ${L} ${H}`} role="img" aria-label={`Evolução da média do grupo em ${unidade}, de ${br(pontos[0].valor)} para ${br(pontos[pontos.length - 1].valor)}.`} className="w-full">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={ml} x2={L - mr} y1={y(t)} y2={y(t)} className="stroke-linha" />
          <text x={ml - 8} y={y(t) + 4} textAnchor="end" className="fill-suave text-[11px]">{br(t)}</text>
        </g>
      ))}
      <polyline fill="none" strokeWidth={2.5} className="stroke-quadra-600" points={pontos.map((p, i) => `${x(i)},${y(p.valor)}`).join(" ")} />
      {pontos.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.valor)} r={4.5} className="fill-quadra-600" />
          <title>{`${dataCurta(p.data)}: média ${br(p.valor)} ${unidade} (${p.n} atleta${p.n > 1 ? "s" : ""})`}</title>
          {i % passo === 0 && <text x={x(i)} y={H - 14} textAnchor="middle" className="fill-suave text-[11px]">{dataCurta(p.data)}</text>}
        </g>
      ))}
    </svg>
  );
}
