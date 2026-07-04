import type { MetadataRoute } from "next";
import { person } from "@/lib/content/profile";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${person.name} — Portfolio`,
    short_name: person.name,
    description: person.headline,
    start_url: "/",
    display: "standalone",
    background_color: "#05060a",
    theme_color: "#05060a",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
