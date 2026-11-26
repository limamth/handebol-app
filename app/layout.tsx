import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { RegistrarServiceWorker } from "@/components/layout/RegistrarServiceWorker";
import "./globals.css";

const corpo = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-corpo" });
const titulo = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-titulo" });

export const metadata: Metadata = {
  title: "BH Hub",
  description: "Gestão de equipas, treinos e desempenho no handebol de praia",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "BH Hub", statusBarStyle: "default" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0F355E" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${corpo.variable} ${titulo.variable}`}>
      <body>
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
