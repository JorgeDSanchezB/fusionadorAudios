import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Fusionador de Audio — une tus audios en uno solo",
  description:
    "Añade tus canciones o grabaciones, ponlas en el orden que quieras y descarga un único audio. Gratis, sin cuentas y sin subir nada a internet.",
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Fusionador de Audio",
    description:
      "Une tus audios en uno solo: sube, ordena y descarga. Todo en tu equipo.",
    type: "website",
  },
};

/* ——— Micro-script de arranque del reveal (mejora progresiva) ———
   Corre como PRIMER hijo del <body>, antes de que el navegador pinte
   cualquier contenido: si (y solo si) JS está vivo y el usuario no pide
   menos movimiento, marca <html> con .reveal-on para habilitar la
   animación de entrada de los .reveal (ver globals.css) y registra el
   IntersectionObserver que los enciende al entrar en pantalla.
   En cualquier otro caso (sin JS, JS roto, módulos de cliente que no
   llegan, prefers-reduced-motion) el contenido queda visible tal cual. */
const ARRANQUE_REVEAL = `(function () {
  'use strict';
  try {
    var w = window, d = document;
    if (!('IntersectionObserver' in w)) return;
    var mq = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq && mq.matches) return;
    d.documentElement.classList.add('reveal-on');
    var iniciar = function () {
      var lista = d.querySelectorAll('.reveal:not(.reveal-in)');
      if (!lista.length) return;
      var io = new IntersectionObserver(function (entradas) {
        for (var i = 0; i < entradas.length; i++) {
          if (entradas[i].isIntersecting) {
            var el = entradas[i].target;
            el.classList.add('reveal-in');
            io.unobserve(el);
          }
        }
      }, { rootMargin: '0px 0px -64px 0px' });
      for (var j = 0; j < lista.length; j++) io.observe(lista[j]);
    };
    if (d.readyState === 'loading') {
      d.addEventListener('DOMContentLoaded', iniciar, { once: true });
    } else {
      iniciar();
    }
  } catch (e) { /* sin animación: el contenido queda visible */ }
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased bg-background text-foreground`}
      >
        <script dangerouslySetInnerHTML={{ __html: ARRANQUE_REVEAL }} />
        {children}
      </body>
    </html>
  );
}
