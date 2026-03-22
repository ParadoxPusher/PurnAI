import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Purn AI",
  description: "Purn AI - Your intelligent assistant powered by Kimi K2.5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased bg-[#121212] text-gray-100 flex flex-col min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
