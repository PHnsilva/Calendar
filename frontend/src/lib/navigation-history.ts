import { useCallback, useEffect, useRef } from "react";

let suppressNextExitGuard = false;

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

export function useModalBrowserBack(open: boolean, key: string, onClose: () => void) {
  const onCloseRef = useLatestRef(onClose);
  const stateIdRef = useRef("");

  useEffect(() => {
    if (!open || typeof window === "undefined") return undefined;
    const stateId = `calendarMateModal:${key}:${Date.now()}`;
    stateIdRef.current = stateId;
    window.history.pushState({ ...(window.history.state ?? {}), calendarMateModal: stateId }, "", window.location.href);
    const handlePopState = () => {
      if (!stateIdRef.current) return;
      stateIdRef.current = "";
      onCloseRef.current();
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      stateIdRef.current = "";
    };
  }, [key, onCloseRef, open]);

  return useCallback(() => {
    const stateId = stateIdRef.current;
    if (open && stateId && typeof window !== "undefined" && window.history.state?.calendarMateModal === stateId) {
      suppressNextExitGuard = true;
      window.history.back();
      return;
    }
    onCloseRef.current();
  }, [onCloseRef, open]);
}

export function useDoubleBackToLeavePage(enabled = true) {
  const lastBackAtRef = useRef(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;
    const guardState = { ...(window.history.state ?? {}), calendarMateExitGuard: true };
    window.history.pushState(guardState, "", window.location.href);
    const handlePopState = () => {
      if (suppressNextExitGuard) {
        suppressNextExitGuard = false;
        return;
      }
      const now = Date.now();
      if (now - lastBackAtRef.current < 1600) {
        window.removeEventListener("popstate", handlePopState);
        window.history.back();
        return;
      }
      lastBackAtRef.current = now;
      window.history.pushState(guardState, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [enabled]);
}
