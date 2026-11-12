import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // El panel de vista previa llega con subdominios *.space-z.ai: autorizarlos
  // en dev evita el aviso (y el futuro bloqueo) de peticiones cruzadas a /_next/*.
  allowedDevOrigins: ["*.space-z.ai"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
