"use client";
import { useSyncExternalStore } from "react";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("leadfacil-preference", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("leadfacil-preference", callback);
  };
}
export function usePreference(key: string, fallback: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(`leadfacil:${key}`) || fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );
  function setValue(next: string) {
    try {
      localStorage.setItem(`leadfacil:${key}`, next);
      window.dispatchEvent(new Event("leadfacil-preference"));
    } catch {
      /* Storage may be disabled in private environments. */
    }
  }
  return [value, setValue] as const;
}
export function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
