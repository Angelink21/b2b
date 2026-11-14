"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="uk" data-theme="light">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#F3F5F7",
          color: "#0F1B2D",
          padding: 48,
        }}
      >
        <h1 style={{ fontWeight: 300 }}>Something went wrong</h1>
        <p style={{ color: "#556171" }}>
          Try refreshing the page. If it keeps happening, use the quote form.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 24,
            minHeight: 44,
            padding: "0 24px",
            borderRadius: 6,
            border: "1.5px solid #C9331C",
            background: "#C9331C",
            color: "#fff",
            fontSize: 16,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
