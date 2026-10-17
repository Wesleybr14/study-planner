import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study Planner",
  description: "Roteiros de estudo personalizados com IA",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Aplica o tema escuro antes da primeira pintura para evitar "flash" branco.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Injeta o tema antes da primeira pintura (evita "flash" branco). */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
