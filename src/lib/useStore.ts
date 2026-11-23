import { useCallback, useRef, useState } from "react";

export type Patch<T> = Partial<T> | ((s: T) => Partial<T>);

/**
 * State object + a ref that always holds the latest value.
 * Lets long async flows (mining, signing) read fresh state after an await, like the prototype's module-level objects.
 */
export function useStore<T extends object>(init: () => T) {
  const [state, setState] = useState(init);
  const ref = useRef(state);
  const set = useCallback((p: Patch<T>) => {
    const patch = typeof p === "function" ? p(ref.current) : p;
    ref.current = { ...ref.current, ...patch };
    setState(ref.current);
  }, []);
  return [state, set, ref] as const;
}
