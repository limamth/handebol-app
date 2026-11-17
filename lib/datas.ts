// O app assume o fuso de Brasília (sem horário de verão desde 2019).
export const FUSO = "America/Sao_Paulo";
export const OFFSET = "-03:00";

export const NOMES_MES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
export const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

export const chaveDia = (iso: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: FUSO }).format(new Date(iso)); // AAAA-MM-DD
export const hora = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
export const dataLonga = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, dateStyle: "full", timeStyle: "short" }).format(new Date(iso));

export const doisDigitos = (n: number) => String(n).padStart(2, "0");
export const mesVizinho = (ano: number, mes: number, delta: number) => {
  const d = new Date(Date.UTC(ano, mes - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${doisDigitos(d.getUTCMonth() + 1)}`;
};
