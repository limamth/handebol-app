// Rota provisória: qualquer módulo ainda não construído cai aqui.
export default function EmConstrucao({ params }: { params: { modulo: string[] } }) {
  return (
    <div className="rounded-lg border border-dashed border-linha bg-white p-10">
      <h1 className="font-titulo text-2xl font-bold">Módulo “{params.modulo[0]}” em construção</h1>
      <p className="mt-2 max-w-prose text-suave">Esta tela entra nas próximas etapas do roadmap.</p>
    </div>
  );
}
