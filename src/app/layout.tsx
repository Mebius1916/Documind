import type { Metadata } from "next";;
import { Inter } from "next/font/google";
import {NuqsAdapter} from "nuqs/adapters/next/app";
import "./globals.css";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { Toaster } from "sonner";
import { EventProvider } from "@/components/event-listener";

import "@liveblocks/react-tiptap/styles.css";
import "@liveblocks/react-ui/styles.css";

const inter =Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Documind",
  description: "AI-Powered Collaborative Docs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={inter.className}
      >
        <NuqsAdapter>
          <ConvexClientProvider>
            <EventProvider>
              <Toaster />
              {children}
            </EventProvider>
          </ConvexClientProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
