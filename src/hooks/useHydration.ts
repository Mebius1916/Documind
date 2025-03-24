import { useState, useEffect, useRef, ReactNode } from 'react';

/**
 * 水合保护 Hook 配置选项接口
 * @template T - fallback 值的类型
 */
interface HydrationOptions<T> {
  /** 水合前显示的内容 */
  fallback?: T | ReactNode;
  /** 延迟水合的时间（毫秒） */
  delay?: number;
  /** 水合完成后的回调函数 */
  onHydrated?: () => void;
  /** 是否跳过自动水合过程 */
  skipHydration?: boolean;
}

/**
 * 水合保护 Hook 返回值接口
 * @template T - fallback 值的类型
 */
interface HydrationResult<T> {
  /** 是否已完成水合 */
  isHydrated: boolean;
  /** 水合前显示的内容 */
  fallbackValue: T | ReactNode;
  /** 手动触发水合的函数 */
  forceHydration: () => void;
}

/**
 * 水合保护 Hook - 用于防止服务端渲染与客户端渲染内容不一致导致的水合错误
 * 
 * 该 Hook 解决的问题：
 * 1. 在 SSR 环境中，服务器无法访问浏览器 API (window, document 等)
 * 2. 当组件依赖这些 API 时，服务端渲染和客户端渲染的结果会不一致
 * 3. 这种不一致会导致 React 水合错误
 * 
 * @param options - 水合配置选项
 * @returns 包含水合状态和控制函数的对象
 */
export function useHydration<T = unknown>(options: HydrationOptions<T> = {}): HydrationResult<T> {
  // 解构配置选项，设置默认值
  const {
    fallback,         // 水合前显示的内容
    delay = 0,        // 延迟水合的时间，默认为 0
    onHydrated,       // 水合完成后的回调函数
    skipHydration = false  // 是否跳过自动水合，默认为 false
  } = options;
  
  // 使用 ref 跟踪组件是否已挂载到 DOM
  // 这可以防止在组件卸载后仍然尝试更新状态
  const isMounted = useRef(false);
  
  // 使用 state 跟踪水合状态
  // 初始值为 false，表示尚未水合
  const [isHydrated, setIsHydrated] = useState(false);
  
  // 使用 ref 存储 fallback 值
  // 这样可以避免 fallback 变化导致的重新渲染
  const fallbackValue = useRef(fallback);
  
  /**
   * 强制触发水合的函数
   * 当需要手动控制水合时间点时使用
   */
  const forceHydration = () => {
    // 只有在组件已挂载且尚未水合的情况下才执行
    if (isMounted.current && !isHydrated) {
      setIsHydrated(true);
      // 如果提供了回调函数，则调用它
      onHydrated?.();
    }
  };
  
  // 使用 useEffect 处理水合逻辑
  // 这个 effect 只在组件挂载和 delay 变化时运行
  useEffect(() => {
    let isActive = true;
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        if (isActive && isMounted.current) {
          setIsHydrated(true);
          onHydrated?.();
        }
      });
    }, delay);

    return () => {
      isActive = false; // 清理标志位
      clearTimeout(timer);
    };
  }, [delay, onHydrated, skipHydration]);
  
  // 返回水合状态、备用值和强制水合函数
  return {
    isHydrated,                  // 当前水合状态
    fallbackValue: fallbackValue.current,  // 水合前显示的内容
    forceHydration               // 手动触发水合的函数
  };
}