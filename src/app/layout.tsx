import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Growth Metrics Dashboard",
  description: "Post and visualize growth metrics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen text-slate-900 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
