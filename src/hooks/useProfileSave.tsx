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

type Updater<T> = Partial<T> | ((previous: T) => T);

export interface DraftSave<T> {
  value: T | null;
  update: (patch: Updater<T>) => void;
  save: () => Promise<void>;
  dirty: boolean;
  saving: boolean;
  error: string | null;
}

export function useDraftSave<T extends object>(
  initial: T | null,
  write: (value: T) => Promise<void>,
): DraftSave<T> {
  const [value, setValue] = useState<T | null>(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valueRef = useRef<T | null>(initial);
  const revision = useRef(0);
  const savingRef = useRef(false);
  const { markSaved } = useSaveStatus();

  useEffect(() => {
    if (initial !== null && valueRef.current === null) {
      valueRef.current = initial;
      setValue(initial);
    }
  }, [initial]);

  const update = useCallback((patch: Updater<T>) => {
    const previous = valueRef.current;
    if (!previous) return;
    const next =
      typeof patch === "function"
        ? patch(previous)
        : ({ ...previous, ...patch } as T);
    valueRef.current = next;
    revision.current += 1;
    setValue(next);
    setDirty(true);
    setError(null);
  }, []);

  const save = useCallback(async () => {
    const next = valueRef.current;
    if (!next || savingRef.current) return;
    const savingRevision = revision.current;
    savingRef.current = true;
    setSaving(true);
    try {
      await write(next);
      if (revision.current === savingRevision) setDirty(false);
      setError(null);
      markSaved();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Couldn’t save.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [markSaved, write]);

  return { value, update, save, dirty, saving, error };
}
