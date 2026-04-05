import { useSyncExternalStore } from "react";
import * as storage from "../lib/storage";

type Listener = () => void;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readToken(): string {
  if (typeof storage.getStoredAdminToken === "function") {
    return storage.getStoredAdminToken();
  }

  if (typeof storage.getAdminToken === "function") {
    return storage.getAdminToken();
  }

  return "";
}

function writeToken(token: string): void {
  if (typeof storage.setStoredAdminToken === "function") {
    storage.setStoredAdminToken(token);
    return;
  }

  if (typeof storage.saveAdminToken === "function") {
    storage.saveAdminToken(token);
  }
}

function removeToken(): void {
  if (typeof storage.clearStoredAdminToken === "function") {
    storage.clearStoredAdminToken();
    return;
  }

  if (typeof storage.clearAdminToken === "function") {
    storage.clearAdminToken();
  }
}

function getSnapshot(): string {
  return readToken();
}

export function saveAdminToken(token: string): void {
  writeToken(token);
  emit();
}

export function clearAdminToken(): void {
  removeToken();
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
