import { useSyncExternalStore } from "react";

export const SIDEBAR_STORAGE_KEY = "weeon.teachers.sidebar.collapsed";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
}

export function writeSidebarCollapsed(collapsed: boolean) {
  window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "1" : "0");
  emit();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSidebarCollapsed() {
  return useSyncExternalStore(subscribe, readSidebarCollapsed, () => false);
}
