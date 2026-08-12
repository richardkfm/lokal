import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "lokal",
  description:
    "Planungswerkzeug für den Umstieg auf Open-Source-Arbeitswerkzeuge, souveränes Hosting und lokale KI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
