import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const baseUrl = "https://quickserver.tf";
const imageUrl =
  "https://raw.githubusercontent.com/sonikro/TF2-QuickServer/main/assets/logo.png";

export const metadata: Metadata = {
  title: "TF2-QuickServer — Deploy TF2 Servers from Discord",
  description:
    "Deploy Team Fortress 2 servers directly from Discord using Docker and multi-cloud infrastructure. Spin up a server in minutes.",
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "TF2-QuickServer — Deploy TF2 Servers from Discord",
    description:
      "Deploy Team Fortress 2 servers directly from Discord using Docker and multi-cloud infrastructure. Spin up a server in minutes.",
    url: baseUrl,
    images: [
      {
        url: imageUrl,
        width: 512,
        height: 512,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: imageUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <head />
      <body className="bg-dark-bg text-[#e6edf3] antialiased">{children}</body>
    </html>
  );
}
