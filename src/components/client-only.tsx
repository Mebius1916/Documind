"use client";

import { ReactNode } from "react";
import { useHydration } from "@/hooks/use-hydration";

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

/**
 * 客户端专用组件包装器
 * 使用水合保护确保子组件只在客户端渲染
 * @param children - 要在客户端渲染的子组件
 * @param fallback - 水合完成前显示的占位内容
 * @param className - 应用于容器的CSS类名
 */
export function ClientOnly({ children, fallback, className }: ClientOnlyProps) {
  const { isHydrated } = useHydration();

  if (!isHydrated) {
    return fallback ? (
      <div className={className}>{fallback}</div>
    ) : (
      <div className={`animate-pulse bg-gray-200 rounded ${className || ''}`} />
    );
  }

  return <div className={className}>{children}</div>;
} 