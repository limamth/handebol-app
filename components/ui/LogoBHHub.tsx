interface LogoBHHubProps {
  variante?: "clara" | "escura";
  subtitulo?: boolean;
  tamanho?: "sm" | "md" | "lg";
}

// Marca vetorial BH Hub (Handebol de Praia) — monograma BH com onda e sol em areia dourada
export function LogoBHHub({ variante = "escura", subtitulo = false, tamanho = "md" }: LogoBHHubProps) {
  const corPrincipal = variante === "escura" ? "#FFFFFF" : "#0F355E";
  const corRecorte = variante === "escura" ? "#0F355E" : "#FFFFFF";
  const corAreia = "#E09F3E";

  const dim = tamanho === "sm" ? 30 : tamanho === "lg" ? 44 : 36;
  const classeTitulo =
    tamanho === "sm"
      ? "font-titulo text-xl font-bold tracking-wide"
      : tamanho === "lg"
      ? "font-titulo text-3xl font-bold tracking-wide"
      : "font-titulo text-2xl font-bold tracking-wide";

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 140 104"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* B */}
        <path
          d="M 10 14 H 42 C 55 14 62 21 62 31 C 62 39 56 45 48 47 C 58 49 65 56 65 67 C 65 80 55 88 40 88 H 10 V 14 Z"
          fill={corPrincipal}
        />
        <path d="M 24 25 H 39 C 45 25 48 28 48 33 C 48 38 45 41 39 41 H 24 V 25 Z" fill={corRecorte} />
        <path d="M 24 54 H 40 C 47 54 51 58 51 65 C 51 72 47 76 40 76 H 24 V 54 Z" fill={corRecorte} />

        {/* H */}
        <rect x="74" y="14" width="14" height="74" rx="2" fill={corPrincipal} />
        <rect x="110" y="14" width="14" height="74" rx="2" fill={corPrincipal} />
        <rect x="84" y="44" width="30" height="13" fill={corPrincipal} />

        {/* Onda fluida conectando B e H */}
        <path
          d="M 4 66 C 28 76, 48 42, 74 39 C 98 36, 118 46, 134 62"
          stroke={corRecorte}
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path
          d="M 6 66 C 30 76, 49 43, 74 40 C 97 37, 117 47, 132 61"
          stroke={corAreia}
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Sol / Bola minimalista */}
        <circle cx="99" cy="22" r="8" fill={corAreia} />
      </svg>

      <div className="leading-none">
        <span className={classeTitulo} style={{ color: corPrincipal }}>
          BH <span style={{ color: corAreia }}>Hub</span>
        </span>
        {subtitulo && (
          <p
            className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: variante === "escura" ? "#CBD5E1" : "#5B6577" }}
          >
            Beach Handball
          </p>
        )}
      </div>
    </div>
  );
}
