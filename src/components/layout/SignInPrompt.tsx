"use client";

import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Chip";
import { useAuth } from "@/lib/auth/AuthProvider";

/** Pantalla para una ruta que requiere sesión. */
export function SignInPrompt({ title, body }: { title: string; body: string }) {
  const { signIn, signingIn, error } = useAuth();

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
      <h1 className="text-display font-extrabold text-ink">{title}</h1>
      <p className="mt-3 font-serif text-prose leading-relaxed text-ink-2">{body}</p>

      <Button size="lg" onClick={() => void signIn()} loading={signingIn} className="mt-6">
        Entrar con Google
      </Button>

      {error ? (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
    </div>
  );
}
