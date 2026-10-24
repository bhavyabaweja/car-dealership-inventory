import { useEffect, useState } from "react";

/**
 * The value, once it has stood still for `delayMs`. Every change restarts the wait, so while
 * someone is typing only the last value of the burst comes through. The first value is used at once.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
