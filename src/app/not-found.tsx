import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-20 sm:px-6">
      <h1 className="text-display font-extrabold text-ink">Esta página no existe</h1>
      <p className="prose-mesira mt-3 text-ink-2">
        Puede que la publicación se haya borrado, o que el enlace esté incompleto. El tablero sigue
        donde estaba.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-12 items-center rounded-card bg-green px-6 text-body font-semibold text-on-green transition-colors hover:bg-green-hover"
      >
        Ir al tablero
      </Link>
    </div>
  );
}
