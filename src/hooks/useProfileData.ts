import { useCallback, useEffect, useState } from "react";

import { useDraftSave, type DraftSave } from "@/hooks/useProfileSave";
import {
    profileStore,
    type Preferences,
    type StyleAssessmentRecord,
    type UserProfile,
} from "@/storage/profile";
import {
    settings,
    type StyleAssessment as LegacyAssessment,
} from "@/storage/settings";

interface LoadState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useLoad<T>(load: () => Promise<T>): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    load()
      .then(
        (data) => !cancelled && setState({ data, loading: false, error: null }),
      )
      .catch(
        (err) =>
          !cancelled &&
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : "Couldn’t load.",
          }),
      );
    return () => {
      cancelled = true;
    };
  }, [load]);
  return state;
}

const loadProfile = () => profileStore.getUserProfile();
const loadPreferences = () => profileStore.getPreferences();
const loadAssessment = () => profileStore.getLatestAssessment();
const loadLegacyAssessment = () =>
  settings.getProfileSettings().then((s) => s.styleAssessment);

export function useUserProfile(): DraftSave<UserProfile> & {
  loading: boolean;
  loadError: string | null;
} {
  const { data, loading, error } = useLoad(loadProfile);
  const write = useCallback(
    (next: UserProfile) => profileStore.saveUserProfile(next),
    [],
  );
  const draft = useDraftSave(data, write);
  return { ...draft, loading, loadError: error };
}

export function usePreferences(): DraftSave<Preferences> & {
  loading: boolean;
  loadError: string | null;
} {
  const { data, loading, error } = useLoad(loadPreferences);
  const write = useCallback(
    (next: Preferences) => profileStore.savePreferences(next),
    [],
  );
  const draft = useDraftSave(data, write);
  return { ...draft, loading, loadError: error };
}

export function useLatestAssessment(): LoadState<StyleAssessmentRecord | null> {
  return useLoad(loadAssessment);
}

export function useLegacyAssessment(): LoadState<LegacyAssessment | null> {
  return useLoad(loadLegacyAssessment);
}
