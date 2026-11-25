
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ShopProvider } from "@/context/ShopContext";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TOYLAND — магазин іграшок",
  description: "Іграшки для дітей різного віку",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk">
      <body>
        <ShopProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </ShopProvider>
      </body>
    </html>
  );
}
