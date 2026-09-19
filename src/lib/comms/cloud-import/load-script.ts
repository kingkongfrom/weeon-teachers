const loaded = new Map<string, Promise<void>>();

export function loadScript(src: string, attributes?: Record<string, string>): Promise<void> {
  const key = `${src}:${JSON.stringify(attributes ?? {})}`;
  const existing = loaded.get(key);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("document_unavailable"));
      return;
    }

    const current = document.querySelector(`script[data-weeon-src="${src}"]`);
    if (current) {
      current.addEventListener("load", () => resolve(), { once: true });
      current.addEventListener("error", () => reject(new Error("script_load_failed")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.weeonSrc = src;
    if (attributes) {
      for (const [name, value] of Object.entries(attributes)) {
        script.setAttribute(name, value);
      }
    }
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("script_load_failed"));
    document.head.appendChild(script);
  });

  loaded.set(key, promise);
  return promise;
}
