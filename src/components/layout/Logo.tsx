import { cx } from "@/lib/format";

/**
 * Marca.
 *
 * La palabra "mesira" (מסירה) significa entrega: pasar algo de una mano a otra.
 * El glifo son dos formas que se pasan un hueco entre sí, dibujado con el mismo
 * grosor de filete que usa el resto de la interfaz, así que pertenece a la página
 * en lugar de estar apoyado encima.
 */
export function Logo({
  className,
  hideWordmarkOnMobile = false,
}: {
  className?: string;
  hideWordmarkOnMobile?: boolean;
}) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 100 100"
        className="size-[1.35rem] shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* el objeto que se entrega */}
        <rect x="39" y="22" width="22" height="22" rx="4.5" />
        {/* las manos ahuecadas que lo reciben */}
        <path d="M24 56 v6 a26 26 0 0 0 52 0 v-6" />
      </svg>
      <span
        className={cx(
          "text-[1.0625rem] font-extrabold tracking-[-0.03em]",
          hideWordmarkOnMobile && "hidden sm:inline",
        )}
      >
        Mesira
      </span>
    </span>
  );
}
