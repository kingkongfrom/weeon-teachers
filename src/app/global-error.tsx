"use client";

import { useEffect } from "react";

/** Root error boundary — renders its own html/body (replaces the root layout). */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[weeon-teachers] global error", error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 24,
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Algo salió mal</h1>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 8,
              padding: "10px 18px",
              borderRadius: 12,
              border: "none",
              background: "#2b59ff",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
