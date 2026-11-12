import {
  AudioLines,
  Download,
  Infinity as InfinityIcon,
  ListMusic,
  Lock,
  Upload,
} from "lucide-react";
import { Reveal } from "@/components/reveal";

/* ——— Onda decorativa del hero: 44 barras con alturas fijas (sin azar en render) ——— */
const ALTURAS_ONDA = [
  0.5, 0.9, 0.65, 1, 0.75, 0.55, 0.85, 0.45, 0.95, 0.7, 0.5, 0.8, 1, 0.6,
  0.9, 0.5, 0.75, 0.95, 0.55, 0.85, 0.65, 0.5, 0.9, 0.7, 1, 0.45, 0.8,
  0.6, 0.95, 0.5, 0.75, 0.85, 0.55, 1, 0.65, 0.9, 0.5, 0.7, 0.95, 0.6,
  0.8, 0.45, 0.75, 0.55,
];

function Onda() {
  return (
    <div
      aria-hidden="true"
      className="eq mx-auto mt-12 flex items-end justify-center gap-[5px]"
    >
      {ALTURAS_ONDA.map((altura, i) => (
        <span
          key={i}
          style={{
            height: `${Math.round(altura * 100)}%`,
            animationDelay: `${((i * 83) % 1200) / 1000}s`,
            animationDuration: `${(1300 + ((i * 137) % 900)) / 1000}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ——— Cinta de formatos ——— */
const FORMATOS = ["MP3", "WAV", "OGG", "M4A", "FLAC"];

function CintaFormatos() {
  // 12 bloques idénticos + padding-right igual al gap: la pista mide exactamente
  // 2 mitades idénticas (W = 12B + 12G ≈ 7.000px) — cubre >2× viewport incluso
  // en monitores 2560px y el bucle translateX(-50%) encaja sin saltos.
  const bloques = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((duplicado) => (
    <div key={duplicado} aria-hidden={duplicado > 0} className="flex items-center gap-10">
      {FORMATOS.map((formato) => (
        <span key={formato} className="flex items-center gap-10">
          <span>{formato}</span>
          <span className="size-1.5 rotate-45 bg-menta/60" />
        </span>
      ))}
    </div>
  ));
  return (
    <div className="overflow-hidden border-y border-linea bg-papel-hondo/60 py-3.5">
      <div className="marquee-pista items-center gap-10 font-mono text-[11px] uppercase tracking-[0.3em] text-tinta-suave">
        {bloques}
      </div>
    </div>
  );
}

/* ——— Tres pasos ——— */
const PASOS = [
  {
    icono: Upload,
    titulo: "Añade tus audios",
    detalle:
      "Arrastra varios archivos a la consola o selecciónalos desde tu equipo: MP3, WAV, OGG, M4A o FLAC.",
  },
  {
    icono: ListMusic,
    titulo: "Ordénalos a tu gusto",
    detalle:
      "Arrastra las pistas dentro de la lista o muévelas con los botones. El orden de la lista es el orden del resultado.",
  },
  {
    icono: Download,
    titulo: "Descarga tu audio",
    detalle:
      "Elige MP3 o WAV, pulsa «Unir audios» y guarda el archivo unido en tu equipo.",
  },
];

const GARANTIAS = [
  {
    icono: Lock,
    titulo: "Privado de verdad",
    detalle: "Tus archivos nunca salen de tu equipo.",
  },
  {
    icono: AudioLines,
    titulo: "Cinco formatos",
    detalle: "MP3, WAV, OGG, M4A y FLAC a la entrada.",
  },
  {
    icono: InfinityIcon,
    titulo: "Gratis, sin letra pequeña",
    detalle: "Sin cuentas, sin anuncios, sin marcas de agua.",
  },
];

/* ——— Script de ejemplos (ajeno al componente): igual que la versión funcional ——— */
const EJEMPLOS_JS = `(function () {
  'use strict';
  var boton = document.getElementById('cargar-ejemplos');
  if (!boton) return;
  boton.addEventListener('click', function () {
    boton.disabled = true;
    boton.textContent = 'Descargando ejemplos…';
    Promise.all(['/samples/tono-440-est.mp3', '/samples/voz-sim.wav', '/samples/tono-660.m4a'].map(function (ruta) {
      return fetch(ruta).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' en ' + ruta);
        return r.blob();
      }).then(function (blob) {
        return new File([blob], ruta.split('/').pop(), { type: blob.type });
      });
    })).then(function (archivos) {
      var merger = document.querySelector('audio-merger');
      return merger.addFiles(archivos);
    }).then(function () {
      boton.textContent = 'Ejemplos cargados';
    }).catch(function () {
      boton.disabled = false;
      boton.textContent = 'No se pudieron cargar los ejemplos';
    });
  });
})();`;

export function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-papel text-tinta">
      <div className="grain" aria-hidden="true" />

      {/* ——— Cabecera ——— */}
      <header className="sticky top-0 z-40 border-b border-linea/80 bg-papel/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <a
            href="#empezar"
            className="font-display rounded-md text-lg leading-none tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-menta"
          >
            Fusionador <span className="italic text-menta-tinta">de audio</span>
          </a>
          <a
            href="#empezar"
            className="group inline-flex min-h-11 items-center gap-1.5 rounded-full bg-tinta px-4 py-2 text-[13px] font-semibold text-papel transition-colors duration-200 hover:bg-menta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menta"
          >
            Unir audios
            <span
              aria-hidden="true"
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            >
              →
            </span>
          </a>
        </div>
      </header>

      <main className="flex-1">
        {/* ——— Hero ——— */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(14,138,98,0.10),transparent_70%)]"
          />
          <div className="relative mx-auto max-w-5xl px-5 pb-14 pt-16 text-center sm:pb-20 sm:pt-24">
            <Reveal>
              <p className="mx-auto max-w-2xl font-mono text-[10px] uppercase tracking-[0.18em] text-tinta-suave sm:text-[11px] sm:tracking-[0.22em]">
                Gratis · Sin cuenta · Sin instalar nada
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="font-display mt-6 text-5xl leading-[0.95] font-semibold tracking-tight text-tinta [text-wrap:balance] sm:text-7xl">
                Une tus audios
                <span className="block">
                  <em className="italic text-menta">en uno solo</em>
                </span>
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-tinta-suave [text-wrap:pretty] sm:text-lg">
                Añade tus canciones o grabaciones, ponlas en el orden que
                quieras y descarga un único archivo. Todo ocurre en tu equipo:
                nada se sube a internet.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="#empezar"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-menta-tinta px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(11,106,76,0.55)] transition-[background-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:bg-menta hover:shadow-[0_14px_28px_-10px_rgba(11,106,76,0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menta"
                >
                  Empezar a unir
                  <span aria-hidden="true">↓</span>
                </a>
                <a
                  href="#pasos"
                  className="inline-flex items-center gap-2 rounded-full border border-tinta/15 bg-transparent px-6 py-3 text-sm font-semibold text-tinta transition-colors duration-200 hover:border-menta hover:text-menta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menta"
                >
                  ¿Cómo funciona?
                </a>
              </div>
            </Reveal>
            <Reveal delay={0.3}>
              <Onda />
            </Reveal>
          </div>
        </section>

        <CintaFormatos />

        {/* ——— La herramienta ——— */}
        <section id="empezar" className="scroll-mt-24">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-menta-tinta">
                La herramienta
              </p>
              <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-tinta sm:text-4xl">
                Sube, ordena y une.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-tinta-suave">
                Arrastra tus archivos a la consola, ordénalos como quieras y
                pulsa «Unir audios». Sin cuenta, sin subir nada a internet.
              </p>
            </Reveal>

            {/* Grupo consola: pedestal centrado, misma retícula que el resto (max-w-2xl) */}
            <Reveal delay={0.1}>
              <div className="relative mx-auto mt-10 max-w-2xl">
                <div
                  aria-hidden="true"
                  className="absolute -inset-5 rounded-[32px] bg-[radial-gradient(55%_65%_at_50%_30%,rgba(62,213,152,0.16),transparent_75%)] blur-2xl"
                />
                <div className="relative rounded-[26px] bg-gradient-to-b from-white/80 to-papel-hondo p-1.5 shadow-[0_30px_60px_-18px_rgba(19,32,26,0.28),0_12px_24px_-12px_rgba(19,32,26,0.14)] sm:p-2">
                  <audio-merger
                    role="region"
                    aria-label="Fusionador de audio: unir pistas"
                    theme="dark"
                    engine-base="/ffmpeg"
                    locale="es"
                    format="mp3"
                    bitrate="192"
                  >
                    {/* Luz de emergencia: hijos del light DOM. Cuando el widget
                        arranca crea su shadow root y estos dejan de pintarse; si
                        el navegador no logra ejecutar el script del widget, esto
                        es lo único que el usuario ve (en vez de un hueco vacío). */}
                    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[20px] bg-bosque px-6 py-12 text-center">
                      <p className="text-base font-semibold text-papel">
                        La consola no se ha iniciado en este navegador.
                      </p>
                      <p className="max-w-sm text-sm leading-relaxed text-papel/70">
                        Necesita JavaScript activo y un navegador actual
                        (Chrome, Edge o Firefox recientes). Si usas un
                        bloqueador de scripts, permite esta página y recarga.
                      </p>
                    </div>
                  </audio-merger>
                </div>
              </div>
            </Reveal>

            {/* Ayuda de demo (ajena al componente): tres clips cortos para probar sin archivos */}
            <Reveal delay={0.15}>
              <div className="mx-auto mt-8 max-w-2xl text-center">
                <button
                  id="cargar-ejemplos"
                  type="button"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-linea bg-white/70 px-5 py-3 text-sm font-semibold text-tinta transition-colors duration-200 hover:border-menta hover:text-menta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menta disabled:cursor-default disabled:opacity-60"
                >
                  Cargar 3 audios de ejemplo
                </button>
                <p className="mt-2.5 text-xs text-tinta-suave">
                  ¿Sin archivos a mano? Prueba la herramienta con tres clips
                  cortos.
                </p>
              </div>
            </Reveal>

            {/* La librería del widget y su cargador de ejemplos: exactly igual que antes */}
            <script src="/audio-merger/audio-merger.umd.js" defer />
            <script dangerouslySetInnerHTML={{ __html: EJEMPLOS_JS }} />
          </div>
        </section>

        {/* ——— Tres pasos ——— */}
        <section
          id="pasos"
          className="scroll-mt-24 border-t border-linea bg-papel-hondo/50"
        >
          <div className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-menta-tinta">
                Así de simple
              </p>
              <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-tinta sm:text-4xl">
                Tres pasos, un audio.
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
              {PASOS.map((paso, i) => (
                <Reveal key={paso.titulo} delay={0.08 * i}>
                  <div className="border-t-2 border-tinta/80 pt-5">
                    <div className="flex items-end justify-between">
                      <span className="font-display text-5xl italic leading-none font-light text-menta">
                        0{i + 1}
                      </span>
                      <paso.icono
                        aria-hidden="true"
                        className="size-6 self-end text-tinta-suave"
                      />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-tinta">
                      {paso.titulo}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-tinta-suave [text-wrap:pretty]">
                      {paso.detalle}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ——— Garantías ——— */}
        <section className="mx-auto w-full max-w-5xl px-5 pb-16 sm:pb-24">
          <Reveal>
            <div className="grid gap-8 rounded-[24px] bg-bosque px-7 py-9 text-papel sm:grid-cols-3 sm:gap-6 sm:px-10 sm:py-10">
              {GARANTIAS.map((garantia) => (
                <div key={garantia.titulo} className="flex flex-col gap-2.5">
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-menta-viva/15 text-menta-viva">
                    <garantia.icono aria-hidden="true" className="size-4.5" />
                  </span>
                  <h3 className="text-sm font-semibold">{garantia.titulo}</h3>
                  <p className="text-sm leading-relaxed text-papel/70 [text-wrap:pretty]">
                    {garantia.detalle}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>
      </main>

      {/* ——— Pie pegado al fondo (min-h-screen + flex-col + mt-auto) ——— */}
      <footer className="mt-auto border-t border-linea bg-papel">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-5 py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))] text-center">
          <p className="font-display text-lg tracking-tight">
            Fusionador <em className="italic text-menta-tinta">de audio</em>
          </p>
          <div aria-hidden="true" className="h-px w-24 bg-linea" />
          <p className="text-xs text-tinta-suave">
            Hecho para unir audios — gratis, sin anuncios y sin cuentas.
          </p>
          <p className="text-[11px] text-tinta-suave">
            Privado por diseño: tu audio nunca sale de tu equipo · ©{" "}
            {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
