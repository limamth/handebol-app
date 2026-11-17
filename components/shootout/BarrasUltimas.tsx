// As últimas 5 batidas do atleta: verde = convertido, vermelho = perdido (a mais recente fica à direita)
export function BarrasUltimas({ resultados }: { resultados: ("convertido" | "perdido")[] }) {
  const barras = Array.from({ length: 5 }, (_, i) => resultados[i] ?? null);
  const texto = resultados.length
    ? `Últimas ${resultados.length} batidas, da mais antiga para a mais recente: ${resultados.map((r) => (r === "convertido" ? "convertida" : "perdida")).join(", ")}`
    : "Sem batidas";
  return (
    <div className="mt-2 flex gap-1.5" role="img" aria-label={texto} title={texto}>
      {barras.map((r, i) => (
        <span key={i} className={`h-2 flex-1 rounded-full ${r === "convertido" ? "bg-emerald-500" : r === "perdido" ? "bg-red-600" : "bg-linha"}`} />
      ))}
    </div>
  );
}
