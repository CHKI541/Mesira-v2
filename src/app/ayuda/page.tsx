import type { Metadata } from "next";
import Link from "next/link";

import {
  ACTIVE_LIFESPAN_DAYS,
  CLOSED_VISIBLE_HOURS,
  DEFAULT_MAX_CONTACTS,
  MAX_MAX_CONTACTS,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Cómo funciona",
  description:
    "Qué es Mesira, cómo publicar algo para regalar, cómo pedir un contacto y qué pasa con tus datos.",
};

const SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "soporte@mesira.net";

const FAQ = [
  {
    q: "¿Cuánto cuesta?",
    a: "Nada, nunca. No hay comisión, no hay cuenta paga y no vendemos publicidad. Si alguien te pide plata por algo que publicó acá, reportalo desde la publicación.",
  },
  {
    q: "¿Por qué tengo que entrar con Google?",
    a: "Para que las dos personas sepan con quién están hablando. Quien regala ve tu nombre y tu celular cuando pedís su contacto, igual que vos ves los suyos. Eso evita la mayor parte de los problemas antes de que pasen.",
  },
  {
    q: "¿Quién ve mi número de teléfono?",
    a: "Solo las personas que piden el contacto de algo que vos publicaste, y solo después de haber entrado con su cuenta. Tu número no aparece en la página, no está en el código de la página y no se lo damos a nadie más.",
  },
  {
    q: "¿Por qué se cerró sola mi publicación?",
    a: `Cuando la publicaste elegiste a cuántas personas querías que les diéramos tu contacto (por defecto ${DEFAULT_MAX_CONTACTS}, hasta ${MAX_MAX_CONTACTS}). Al llegar a ese número se cierra, para que no te sigan escribiendo por algo que ya entregaste. Podés volver a abrirla cuando quieras desde Mi cuenta.`,
  },
  {
    q: "Entregué el artículo. ¿Qué hago?",
    a: 'Entrá a Mi cuenta, buscá la publicación y tocá "Ya la entregué". Queda guardada en tu historial y deja de aparecer en el tablero.',
  },
  {
    q: "Nadie vino a buscar lo que regalo. ¿Lo puedo volver a publicar?",
    a: 'Sí. En Mi cuenta tocá "Volver a publicar": vuelve arriba de todo en el tablero, con el contador de contactos otra vez en cero. No hace falta cargar las fotos de nuevo.',
  },
  {
    q: "¿Cuánto tiempo queda visible una publicación?",
    a: `Mientras esté disponible, hasta ${ACTIVE_LIFESPAN_DAYS} días. Una vez cerrada o entregada sigue viéndose ${CLOSED_VISIBLE_HOURS} horas más y después desaparece del tablero, aunque vos la seguís viendo en tu cuenta.`,
  },
  {
    q: "¿Me llegan muchos correos?",
    a: "Vos elegís. En Mi cuenta podés pedir que te avisemos solo cuando aparezca algo que coincide con tus alertas, o de cada publicación nueva, o de nada. También podés elegir si querés los avisos por correo o como notificación en el celular.",
  },
  {
    q: "¿Se puede vender algo acá?",
    a: "No. Mesira es solo para regalar. Si ves una publicación donde en realidad están vendiendo, reportala: la revisamos y la damos de baja.",
  },
  {
    q: "¿Puedo instalar Mesira como aplicación?",
    a: "Sí. Desde Chrome en Android o Safari en iPhone, abrí el menú del navegador y elegí “Agregar a la pantalla de inicio”. Queda con su ícono y se abre como cualquier aplicación.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
      <div className="py-8">
        <h1 className="text-display font-extrabold text-ink">Cómo funciona</h1>
        <p className="prose-mesira mt-4 text-ink-2">
          Mesira es un tablero de la comunidad judía argentina para regalar cosas que ya no usás.
          No es un lugar de compra y venta: acá todo se entrega gratis, de una persona a otra.
        </p>
      </div>

      <section className="border-t border-rule py-8">
        <h2 className="text-h2 font-bold text-ink">Para regalar algo</h2>
        <ol className="mt-4 flex flex-col gap-4">
          {[
            "Sacale una foto con buena luz. Si tiene una marca o le falta una pieza, mostralo: evita malentendidos después.",
            "Contá cómo está de verdad, dónde se retira y desde cuándo lo tenés.",
            "Elegí a cuántas personas querés que les demos tu contacto. Al llegar a ese número la publicación se cierra sola.",
            "Cuando lo entregues, marcalo como entregado.",
          ].map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-dot border border-rule-strong text-small font-bold text-ink-2 tabular-nums">
                {index + 1}
              </span>
              <p className="prose-mesira text-ink">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-rule py-8">
        <h2 className="text-h2 font-bold text-ink">Para pedir algo</h2>
        <ol className="mt-4 flex flex-col gap-4">
          {[
            "Buscá en el tablero o creá una alerta con lo que necesitás y te avisamos apenas aparezca.",
            'Entrá a la publicación y tocá "Ver el contacto". Quien lo regala recibe un aviso con tu nombre y tu celular.',
            "Escribile por WhatsApp y coordinen dónde y cuándo.",
            "Si al final no lo vas a buscar, avisale. Hay otras personas esperando ese lugar.",
          ].map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-dot border border-rule-strong text-small font-bold text-ink-2 tabular-nums">
                {index + 1}
              </span>
              <p className="prose-mesira text-ink">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-rule py-8">
        <h2 className="text-h2 font-bold text-ink">Preguntas frecuentes</h2>
        <dl className="mt-4">
          {FAQ.map((item) => (
            <div key={item.q} className="border-b border-rule py-4">
              <dt className="text-h3 font-semibold text-ink">{item.q}</dt>
              <dd className="prose-mesira mt-1.5 text-ink-2">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-t border-rule py-8">
        <h2 className="text-h2 font-bold text-ink">¿Algo no anda?</h2>
        <p className="prose-mesira mt-2 text-ink-2">
          Escribinos a{" "}
          <a href={`mailto:${SUPPORT}`} className="text-ink underline underline-offset-4">
            {SUPPORT}
          </a>{" "}
          y contanos qué pasó. Si es un problema con una publicación en particular, mandanos el
          enlace.
        </p>
        <p className="mt-6">
          <Link href="/" className="text-body font-semibold text-ink underline underline-offset-4">
            Volver al tablero
          </Link>
        </p>
      </section>
    </div>
  );
}
