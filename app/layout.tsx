import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "SIGCO | Sistema Integral de Gestión Comercial y Operativa";
const description =
  "Gestión, analítica y reportes administrativos de los espacios comerciales del Aeropuerto Internacional Felipe Ángeles.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "es_MX",
      images: [{ url: imageUrl, width: 1672, height: 941, alt: "SIGCO, Sistema Integral de Gestión Comercial y Operativa del AIFA" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
