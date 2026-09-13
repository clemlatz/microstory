import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader, Source_Serif_4, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
});

const sourceSans3 = Source_Sans_3({
  variable: "--font-source-sans-3",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Microstory",
  description: "Writing assistant",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Microstory",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} ${sourceSerif4.variable} ${sourceSans3.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col overflow-hidden">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
