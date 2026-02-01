import { IBM_Plex_Mono } from "next/font/google";
import { Roboto } from "next/font/google";

export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400","600","700"],
});

export const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "600","700"],
});