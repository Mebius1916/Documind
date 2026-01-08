import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { EventBusProvider } from "@/components/event-bus-provider";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Documind",
  description: "基于 Next.js 的协同文档平台，集成 AI 对话和实时聊天",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="zh-CN">
        <body className={inter.className}>
          <NuqsAdapter>
            <ConvexClientProvider>
              <EventBusProvider enableDevLogs={true}>
                <Toaster />
                {children}
              </EventBusProvider>
            </ConvexClientProvider>
          </NuqsAdapter>
        </body>
      </html>
    </ClerkProvider>
  );
}
