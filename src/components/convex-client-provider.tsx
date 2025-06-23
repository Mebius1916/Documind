"use client";

import {
  Authenticated,
  ConvexReactClient,
  Unauthenticated,
  AuthLoading,
} from "convex/react";
import { ReactNode } from "react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth, SignIn } from "@clerk/clerk-react";
import { FullscreenLoader } from "./fullscreen-loader";
import { useHydration } from "@/hooks/use-hydration";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const { isHydrated } = useHydration();

  // 在水合完成前显示加载状态
  if (!isHydrated) {
    return <FullscreenLoader label="正在初始化应用..." />;
  }

  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {/* 已登录状态显示子内容 */}
        <Authenticated>{children}</Authenticated>
        
        {/* 未登录时显示登录表单 */}
        <Unauthenticated>
          <div className="flex justify-center items-center min-h-screen">
            <SignIn routing="hash"/> {/* 使用 hash 路由的登录组件 */}
          </div>
        </Unauthenticated>

        {/* 认证加载状态显示全屏加载器 */}
        <AuthLoading>
          <FullscreenLoader label="Auth loading..."/>
        </AuthLoading>

      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}