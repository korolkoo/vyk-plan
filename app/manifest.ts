import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VYK Plan — Finanças & Casamento",
    short_name: "vyk",
    description: "Controle financeiro pessoal minimalista e planejamento do casamento para Yuri & Vithória",
    start_url: "/",
    display: "standalone",
    background_color: "#0B192C",
    theme_color: "#173B64",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
