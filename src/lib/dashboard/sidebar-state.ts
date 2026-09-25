import { useSyncExternalStore } from "react";

const STORAGE_KEY = "weeon.teachers.sidebar.collapsed";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function writeSidebarCollapsed(collapsed: boolean) {
  window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  emit();
}

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSidebarCollapsed() {
  return useSyncExternalStore(subscribe, readCollapsed, () => false);
}
