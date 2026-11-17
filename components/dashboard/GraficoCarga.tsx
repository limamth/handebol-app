// Gráfico de barras em SVG puro (sem biblioteca). Trocar por Recharts se precisar de interação.
export function GraficoCarga({ dados }: { dados: { dia: string; ua: number }[] }) {
  const max = Math.max(...dados.map((d) => d.ua), 1);
  return (
    <figure>
      <svg viewBox="0 0 350 160" role="img" aria-label="Carga interna diária em unidades arbitrárias" className="w-full">
        {dados.map((d, i) => {
          const h = (d.ua / max) * 120;
          const x = i * 50 + 8;
          return (
            <g key={d.dia}>
              <rect x={x} y={130 - h} width={34} height={h} rx={3} className="fill-quadra-600" />
              <text x={x + 17} y={150} textAnchor="middle" className="fill-suave text-[11px]">{d.dia}</text>
              {d.ua > 0 && <text x={x + 17} y={124 - h} textAnchor="middle" className="fill-tinta text-[10px]">{d.ua}</text>}
            </g>
          );
        })}
      </svg>
      <figcaption className="text-xs text-suave">Carga = percepção de esforço (RPE) × minutos da sessão</figcaption>
    </figure>
  );
}
