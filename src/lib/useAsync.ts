import { useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data?: T;
  error?: Error;
  loading: boolean;
  reload: () => void;
}

/** Ejecuta una función async cuando cambian las dependencias; ignora respuestas viejas. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], enabled = true): AsyncState<T> {
  const [state, setState] = useState<{ data?: T; error?: Error; loading: boolean }>({ loading: enabled });
  const [tick, setTick] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setState({ loading: false });
      return;
    }
    const my = ++seq.current;
    setState((s) => ({ data: s.data, loading: true }));
    fn().then(
      (data) => my === seq.current && setState({ data, loading: false }),
      (error) => my === seq.current && setState({ error: error instanceof Error ? error : new Error(String(error)), loading: false }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}
