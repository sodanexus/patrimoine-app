
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patrimoine",
  description: "Tableau de bord – Finances & Patrimoine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
