import { OFFSET, chaveDia } from "./datas";

export const hojeChave = () => chaveDia(new Date().toISOString());

export function somarDias(chave: string, n: number) {
  const [a, m, d] = chave.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

export const ultimosDias = (n: number) => Array.from({ length: n }, (_, i) => somarDias(hojeChave(), i - (n - 1)));
export const inicioDoDia = (chave: string) => `${chave}T00:00:00${OFFSET}`;

// Segunda-feira da semana da data informada
export function inicioDaSemana(chave = hojeChave()) {
  const [a, m, d] = chave.split("-").map(Number);
  const diaSemana = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return somarDias(chave, -((diaSemana + 6) % 7));
}

export const rotuloDiaSemana = (chave: string) => ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][new Date(`${chave}T12:00:00Z`).getUTCDay()];
export const dataCurta = (chave: string) => chave.split("-").reverse().slice(0, 2).join("/");
