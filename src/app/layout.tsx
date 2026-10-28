import type { Metadata, Viewport } from "next";
import { RegistroServiceWorker } from "@/components/RegistroServiceWorker";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Memorias Ivan",
  description: "Lee, edita y crea las notas de tu vault de Obsidian desde el iPhone.",
  applicationName: "Memorias Ivan",
  appleWebApp: { capable: true, title: "Memorias", statusBarStyle: "black-translucent" },
  icons: { apple: "/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1e1e1e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>
        {children}
        <RegistroServiceWorker />
      </body>
    </html>
  );
}
