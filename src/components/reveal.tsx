import type { CSSProperties, ReactNode } from "react";

/**
 * Reveal: aparición suave al entrar en viewport (una sola vez).
 *
 * Mejora progresiva: el HTML que llega del servidor sale 100% visible —
 * sin `opacity:0` en línea. La animación la activan el micro-script de
 * arranque del layout (clase `reveal-on` en <html>) + IntersectionObserver
 * + CSS en globals.css. Si el JS del cliente nunca llega a ejecutarse
 * (navegador antiguo, red lenta, bloqueadores), la página se lee completa
 * tal cual: nunca más un hero vacío.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const estilo: CSSProperties | undefined =
    delay > 0
      ? ({ "--reveal-delay": `${delay}s` } as CSSProperties)
      : undefined;

  return (
    <div
      className={className ? `${className} reveal` : "reveal"}
      style={estilo}
      // El IntersectionObserver añade .reveal-in a este mismo div, a veces
      // antes de que React hidrate → sin esto, React 19 avisa de un diff de
      // className inofensivo (ruido de consola + badge "1 Issue" en dev).
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}
