import { useCallback, useRef } from "react";

export const useThrottle = <T extends (...args: any[]) => void>(fn: T, delay: number) => {
  const lastExec = useRef(0);
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastExec.current >= delay) {
      fn(...args);
      lastExec.current = now;
    }
  }, [fn, delay]);
}