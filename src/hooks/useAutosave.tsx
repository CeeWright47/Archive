import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";

// Lets any sub-page report a successful write so the Stack header can flash "Saved".
type SaveStatusValue = {
  savedAt: number | null;
  markSaved: () => void;
};

const SaveStatusContext = createContext<SaveStatusValue>({
  savedAt: null,
  markSaved: () => {},
});

export function SaveStatusProvider({ children }: { children: ReactNode }) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const markSaved = useCallback(() => setSavedAt(Date.now()), []);
  const value = useMemo(() => ({ savedAt, markSaved }), [savedAt, markSaved]);
  return (
    <SaveStatusContext.Provider value={value}>
      {children}
    </SaveStatusContext.Provider>
  );
}

export function useSaveStatus() {
  return useContext(SaveStatusContext);
}

const DEFAULT_DEBOUNCE_MS = 400;

type Updater<T> = Partial<T> | ((previous: T) => T);

export interface Autosave<T> {
  value: T | null;
  update: (patch: Updater<T>) => void;
  flush: () => void;
  error: string | null;
}

// Debounced optimistic writer. `update` edits local state and schedules a write;
// `flush` writes immediately (call on blur). On failure the value reverts to the
// last persisted record and `error` is set.
export function useAutosave<T extends object>(
  initial: T | null,
  write: (value: T) => Promise<void>,
  debounceMs: number = DEFAULT_DEBOUNCE_MS,
): Autosave<T> {
  const [value, setValue] = useState<T | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const committed = useRef<T | null>(initial);
  const pending = useRef<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { markSaved } = useSaveStatus();

  useEffect(() => {
    if (initial !== null && committed.current === null) {
      committed.current = initial;
      setValue(initial);
    }
  }, [initial]);

  const commit = useCallback(() => {
    const next = pending.current;
    pending.current = null;
    if (!next) return;
    write(next)
      .then(() => {
        committed.current = next;
        setError(null);
        markSaved();
      })
      .catch((err) => {
        setValue(committed.current);
        setError(err instanceof Error ? err.message : "Couldn’t save.");
      });
  }, [write, markSaved]);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    commit();
  }, [commit]);

  const update = useCallback(
    (patch: Updater<T>) => {
      setValue((previous) => {
        const base = previous ?? committed.current;
        if (!base) return previous;
        const next =
          typeof patch === "function"
            ? patch(base)
            : ({ ...base, ...patch } as T);
        pending.current = next;
        return next;
      });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        commit();
      }, debounceMs);
    },
    [commit, debounceMs],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { value, update, flush, error };
}
