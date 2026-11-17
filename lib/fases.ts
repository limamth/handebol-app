export type StatusFase = "em_andamento" | "futura" | "encerrada";

export const statusFase = (f: { inicio: string; fim: string }, hoje: string): StatusFase =>
  f.fim < hoje ? "encerrada" : f.inicio > hoje ? "futura" : "em_andamento";

export const ROTULO_STATUS_FASE: Record<StatusFase, string> = { em_andamento: "Em andamento", futura: "Futura", encerrada: "Encerrada" };
export const dataBr = (d: string) => d.split("-").reverse().join("/");
