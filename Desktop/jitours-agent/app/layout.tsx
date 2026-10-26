import type { Metadata } from "next";
import { LocaleProvider } from "@/components/LocaleProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jordan Inspiration Tours | Journeys, your way",
  description: "Discover Jordan with locally inspired private and small-group tours.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><LocaleProvider>{children}</LocaleProvider></body>
    </html>
  );
}
