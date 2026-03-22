import { useSyncExternalStore } from "react";
import {
  clearStoredAdminToken,
  getStoredAdminToken,
  setStoredAdminToken,
} from "../lib/storage";

type Listener = () => void;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): string {
  return getStoredAdminToken();
}

export function saveAdminToken(token: string): void {
  setStoredAdminToken(token);
  emit();
}

export function clearAdminToken(): void {
  clearStoredAdminToken();
  emit();
}

export function useAdminStore() {
  const token = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    token,
    hasToken: token.length > 0,
    saveToken: saveAdminToken,
    clearToken: clearAdminToken,
  };
}
