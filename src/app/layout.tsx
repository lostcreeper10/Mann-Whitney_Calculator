import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const serif = Source_Serif_4({ variable: "--font-serif-math", subsets: ["latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Mann–Whitney U Test Calculator | Cordova Public College",
  description:
    "Advanced Statistics computation tool for Cordova Public College: rank two independent groups, compute U₁, U₂, the U statistic, critical value and p-value step by step.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
