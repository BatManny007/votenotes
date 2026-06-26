import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoteNotes — Suggest anonymously. Vote anonymously. Decide together.",
  description: "An anonymous collaborative decision-making platform for groups.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
