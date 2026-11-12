import type { Metadata } from "next";
import { Landing } from "@/components/landing";

export const metadata: Metadata = {
  title: "Fusionador de Audio — une tus audios en uno solo",
  description:
    "Añade tus canciones o grabaciones, ponlas en el orden que quieras y descarga un único audio. Gratis, sin cuentas y sin subir nada a internet.",
};

export default function Home() {
  return <Landing />;
}
