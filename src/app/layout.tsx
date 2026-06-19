import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tolerancing — engineering tolerance analysis",
  description:
    "ISO 286 fits, tolerance stack-up with yield prediction, thread fits and bolt torque for mechanical engineering teams.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
