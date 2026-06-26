import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";

// TMC's web font. Exposed as a CSS variable consumed by --font-sans in globals.
const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TMC Insurance Checks",
  description: "Certificate of Motor Insurance validation, The Miles Consultancy",
  icons: { icon: "/brand/favicon.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" className={openSans.variable}>
      <body>{children}</body>
    </html>
  );
}
