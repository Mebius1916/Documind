import { useCallback, useRef, useEffect } from "react";

export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    if (!mountedRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current && document.visibilityState === 'visible') {
        callback(...args);
      }
    }, delay);
  }, [callback, delay]);
}

//js版本：
// import { useCallback, useRef } from "react";
// export function useDebounce(callback, delay = 500) {
//   const timeoutRef = useRef();
//   return useCallback(
//     (...args) => {
//       if (timeoutRef.current) {
//         clearTimeout(timeoutRef.current);
//       }
//       timeoutRef.current = setTimeout(() => {
//         callback(...args);
//       }, delay);
//     },
//     [callback, delay]
//   );
// }
