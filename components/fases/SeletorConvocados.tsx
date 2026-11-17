"use client";

import { useRef } from "react";

interface Props { atletas: { id: string; nome: string; equipas: string }[]; selecionados: string[] }

export function SeletorConvocados({ atletas, selecionados }: Props) {
  const ref = useRef<HTMLFieldSetElement>(null);
  const marcar = (valor: boolean) =>
    ref.current?.querySelectorAll<HTMLInputElement>('input[name="convocado"]').forEach((i) => { i.checked = valor; });

  return (
    <fieldset ref={ref} className="sm:col-span-2">
      <legend className="text-sm font-medium">Atletas convocados</legend>
      <p className="mb-2 text-xs text-suave">Só os convocados registram RPE e bem-estar nesta fase. Todos continuam vendo o calendário e os treinos.</p>
      <div className="mb-2 flex gap-4 text-sm">
        <button type="button" onClick={() => marcar(true)} className="text-quadra-600 underline">Marcar todos</button>
        <button type="button" onClick={() => marcar(false)} className="text-quadra-600 underline">Limpar</button>
      </div>
      {atletas.length === 0 ? <p className="text-sm text-suave">Nenhum atleta cadastrado.</p> : (
        <ul className="grid gap-1 sm:grid-cols-2">
          {atletas.map((a) => (
            <li key={a.id}>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="convocado" value={a.id} defaultChecked={selecionados.includes(a.id)} />
                <span>{a.nome}{a.equipas ? <span className="ml-1 text-xs text-suave">({a.equipas})</span> : null}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
