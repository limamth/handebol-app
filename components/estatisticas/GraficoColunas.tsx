export function GraficoColunas({ dados, descricao }: { dados: { rotulo: string; valor: number }[]; descricao: string }) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  const largura = 640, altura = 180, base = 140;
  const passo = largura / dados.length;
  const larguraBarra = Math.min(48, passo * 0.6);
  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={descricao} className="w-full">
      {dados.map((d, i) => {
        const h = (d.valor / max) * 110;
        const x = i * passo + (passo - larguraBarra) / 2;
        return (
          <g key={i}>
            <rect x={x} y={base - h} width={larguraBarra} height={h} rx={3} className="fill-quadra-600" />
            <text x={x + larguraBarra / 2} y={base - h - 6} textAnchor="middle" className="fill-tinta text-[12px]">{d.valor}</text>
            <text x={x + larguraBarra / 2} y={base + 20} textAnchor="middle" className="fill-suave text-[11px]">{d.rotulo}</text>
          </g>
        );
      })}
    </svg>
  );
}
