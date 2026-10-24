"use client";

// Shown only when the root layout itself fails, so it cannot rely on the
// site's stylesheet or fonts.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F8FAFC", color: "#17212B" }}>
        <main style={{ maxWidth: 520, margin: "0 auto", padding: "96px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 24, color: "#173B57" }}>StayNest is having trouble</h1>
          <p style={{ color: "#64748B" }}>Please try again in a moment.</p>
          {digest && <p style={{ color: "#64748B", fontSize: 12 }}>Reference: {digest}</p>}
          <button
            onClick={() => retry()}
            style={{ marginTop: 24, padding: "10px 16px", border: 0, borderRadius: 6, background: "#173B57", color: "#fff", fontSize: 15 }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
