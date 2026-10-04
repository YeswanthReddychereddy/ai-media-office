import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "AI Media Office — Your studio, in motion",
  description:
    "A Founder-controlled digital media company. See your team, direct production and review every important decision.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
