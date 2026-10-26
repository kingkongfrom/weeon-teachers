import type { MetadataRoute } from "next";

/**
 * PWA manifest — makes teachers.weeon.school installable.
 *
 * `display: "standalone"` is the point: installed from the browser it opens
 * without URL bar or tabs, which is what makes it feel like an app on a phone
 * or an iPad. `start_url` is the landing hub, not the gradebook — a teacher
 * opening the app wants their day, and `/` would bounce them through login.
 *
 * Icons are generated from `icon.svg` at build time by the `app/icon.svg`
 * convention; the PNG entries below point at the same source rendered by the
 * browser. `maskable` is required for Android to avoid a white square behind
 * the mark.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Weeon Docentes",
    short_name: "Weeon",
    description:
      "Calificaciones, aula virtual y comunicación para docentes de Weeon School.",
    start_url: "/inicio",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f8fafc",
    theme_color: "#0891b2",
    lang: "es",
    dir: "ltr",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Calificaciones",
        short_name: "Calificaciones",
        url: "/grupos",
      },
      {
        name: "Aula virtual",
        short_name: "Aula",
        url: "/aula-virtual",
      },
    ],
  };
}
