import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Ropimo — Everything your team needs to get work done",
  description:
    "Ropimo brings projects, tasks, files, documents, planning, and teamwork into one simple, unified workspace.",
  icons: {
    icon: [
      { url: "/logo/favicon.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: "/logo/favicon.png",
    shortcut: "/logo/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${plusJakartaSans.variable}`}
    >
      <head>
        <link rel="icon" type="image/png" href="/logo/favicon.png" />
        <link rel="shortcut icon" href="/logo/favicon.png" />
        <link rel="apple-touch-icon" href="/logo/favicon.png" />
      </head>
      <body
        suppressHydrationWarning
        className="flex min-h-screen flex-col bg-white text-zinc-900 antialiased selection:bg-zinc-900 selection:text-white"
      >
        {children}
        <Toaster position="bottom-right" closeButton />
      </body>
    </html>
  );
}
