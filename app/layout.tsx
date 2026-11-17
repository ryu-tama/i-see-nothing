import type { Metadata } from "next";
import { Montserrat, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "I See Nothing — Zero-Knowledge Self-Destructing Notes & File Sharing",
  description: "Kirim pesan rahasia terenkripsi yang hancur setelah satu kali baca.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${montserrat.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
