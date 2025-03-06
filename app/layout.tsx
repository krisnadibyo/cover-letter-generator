import type React from "react";
import "@/styles/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cover Letter Generator",
  description:
    "Generate tailored cover letters based on your CV, job description, and company profile",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background flex flex-col">
          <div className="flex-1">{children}</div>
          <footer className="border-t py-4">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
              <span>&copy; {new Date().getFullYear()} crafted by </span>
              {" "}
              <a
                href="https://github.com/krisnadibyo/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="text-blue-500">Krisna D.A.</span>
              </a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
