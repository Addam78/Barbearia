type MarkProps = {
  className?: string;
};

/** Marca da Barbearia: navalha reta cruzando um bigode. */
export function Mark({ className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Navalha reta, na diagonal */}
        <path d="M10 46 L40 16" />
        <path d="M40 16 L50 10 L54 14 L48 20" />
        <path d="M40 16 L44 20" />

        {/* Bigode */}
        <path
          d="M14 40
             C 18 34, 24 32, 28 36
             C 30 33, 34 33, 36 36
             C 40 32, 46 34, 50 40
             C 44 38, 39 39, 36 43
             C 34 40, 30 40, 28 43
             C 25 39, 20 38, 14 40 Z"
          fill="currentColor"
          stroke="none"
        />
      </g>
    </svg>
  );
}
