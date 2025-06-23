import { useState, useEffect, useRef } from 'react';

export function useHydration(options: any = {}) {
  const { fallback, skipHydration = false } = options;
  const [isHydrated, setIsHydrated] = useState(skipHydration);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    if (!skipHydration) {
      // 使用 requestAnimationFrame 确保在下一帧更新
      const frame = requestAnimationFrame(() => {
        // 保证当前组件是挂载状态
        if (isMounted.current) {
          setIsHydrated(true);
        }
      });
      
      // 销毁实例防止内存泄露
      return () => {
        cancelAnimationFrame(frame);
        isMounted.current = false;
      };
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [skipHydration]);

  return {
    isHydrated,
    fallbackValue: fallback,
  };
}
