import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidad",
  description: "Qué datos guarda Mesira, para qué, y cómo pedir que los borremos.",
};

const SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "soporte@mesira.net";

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
      <div className="py-8">
        <h1 className="text-display font-extrabold text-ink">Privacidad</h1>
        <p className="mt-2 text-small text-ink-2">Última actualización: septiembre de 2026.</p>
      </div>

      <div className="prose-mesira flex flex-col gap-8 border-t border-rule pt-8 text-ink">
        <Section title="Qué guardamos">
          <ul className="ml-5 list-disc">
            <li>Tu nombre, apellido, correo y celular.</li>
            <li>Tu kehilá y, si lo cargaste, tu barrio.</li>
            <li>Las publicaciones que creás, con sus fotos.</li>
            <li>Las alertas que configurás.</li>
            <li>De qué publicaciones pediste el contacto.</li>
            <li>Si activaste notificaciones, un identificador del dispositivo.</li>
          </ul>
        </Section>

        <Section title="Quién ve tu celular">
          <p>
            Tu celular no aparece en la página y no viaja al navegador de nadie. Se guarda aparte
            de la publicación, en un lugar que solo puede leer nuestro servidor, y se entrega
            únicamente a una persona que inició sesión, completó su perfil y pidió expresamente el
            contacto de algo que vos publicaste. Cada vez que eso pasa te llega un correo con el
            nombre y el celular de quien lo pidió.
          </p>
        </Section>

        <Section title="Qué ve el resto">
          <p>
            En una publicación se ve tu nombre y la inicial de tu apellido, tu kehilá y el barrio
            donde se retira. No se ve tu apellido completo, ni tu correo, ni tu dirección, ni tu
            teléfono.
          </p>
        </Section>

        <Section title="Para qué usamos tus datos">
          <p>
            Solo para que Mesira funcione: mostrar las publicaciones, conectar a dos personas que
            quieren coordinar una entrega, y mandarte los avisos que pediste. No vendemos ni
            compartimos tus datos con nadie, y no hay publicidad en la plataforma.
          </p>
        </Section>

        <Section title="Servicios que usamos">
          <ul className="ml-5 list-disc">
            <li>
              <strong>Google Firebase</strong> para el inicio de sesión, la base de datos, las fotos
              y las notificaciones.
            </li>
            <li>
              <strong>Vercel</strong> para alojar la página.
            </li>
            <li>
              <strong>Resend</strong> para enviar los correos.
            </li>
          </ul>
          <p>
            Cada uno recibe únicamente lo que necesita para cumplir su función. No usamos servicios
            de analítica ni de seguimiento publicitario.
          </p>
        </Section>

        <Section title="Cuánto tiempo">
          <p>
            Tus publicaciones quedan mientras vos las quieras. Si borrás una, se borra con sus
            fotos. Si querés borrar tu cuenta entera, escribinos y la eliminamos junto con todas
            tus publicaciones y alertas.
          </p>
        </Section>

        <Section title="Tus derechos">
          <p>
            Podés pedirnos una copia de tus datos, corregirlos o borrarlos. Escribinos a{" "}
            <a href={`mailto:${SUPPORT}`} className="underline underline-offset-4">
              {SUPPORT}
            </a>{" "}
            desde el correo de tu cuenta y lo resolvemos.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            Usamos una sola cookie, la de tu sesión, para saber que sos vos mientras navegás. No
            hay cookies de publicidad ni de seguimiento. La cookie no puede ser leída por scripts de
            la página, así que tampoco por un tercero.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-sans text-h2 font-bold text-ink">{title}</h2>
      <div className="mt-2 flex flex-col gap-3 text-ink-2">{children}</div>
    </section>
  );
}
