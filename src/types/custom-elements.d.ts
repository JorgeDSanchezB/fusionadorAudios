import type React from "react";

/**
 * Declaración de tipos para el Web Component <audio-merger> embebido en la
 * landing (los atributos válidos viven en audio-merger/src/config/atributos.ts).
 */
declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        "audio-merger": React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement>,
          HTMLElement
        >;
      }
    }
  }
}

export {};
