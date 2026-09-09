import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { getViewer } from "@/lib/auth/context";
import { themeInitScript } from "@/lib/settings/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WCV — West Complex Village",
  description: "Community app for the residents of West Complex Village.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Theme is stored per user in wcv.user_settings (via getViewer). Apply it on
  // the server to avoid a flash; `system` is resolved before paint by a script.
  const { theme } = await getViewer();
  const darkClass = theme === "dark" ? "dark" : "";
  const initScript = themeInitScript(theme);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${darkClass} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {initScript ? (
          <script dangerouslySetInnerHTML={{ __html: initScript }} />
        ) : null}
        {children}
      </body>
    </html>
  );
}
