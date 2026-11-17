export function CartaoIndicador({ rotulo, valor, detalhe, destaque = false }: { rotulo: string; valor: string; detalhe?: string; destaque?: boolean }) {
  return (
    <div className={`rounded-lg border p-5 ${destaque ? "border-bola-500 bg-bola-100" : "border-linha bg-white"}`}>
      <p className="text-sm text-suave">{rotulo}</p>
      <p className="mt-1 font-titulo text-4xl font-bold">{valor}</p>
      {detalhe && <p className="mt-1 text-sm text-suave">{detalhe}</p>}
    </div>
  );
}
