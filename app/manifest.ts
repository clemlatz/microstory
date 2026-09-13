import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Microstory",
    short_name: "Microstory",
    description: "Writing assistant",
    start_url: "/",
    display: "standalone",
    background_color: "#fdfbf6",
    theme_color: "#fdfbf6",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
