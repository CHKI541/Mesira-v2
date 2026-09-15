import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de uso",
  description: "Las reglas de Mesira, escritas para que se entiendan.",
};

const SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "soporte@mesira.net";

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
      <div className="py-8">
        <h1 className="text-display font-extrabold text-ink">Términos de uso</h1>
        <p className="mt-2 text-small text-ink-2">Última actualización: septiembre de 2026.</p>
      </div>

      <div className="prose-mesira flex flex-col gap-8 border-t border-rule pt-8 text-ink">
        <Section title="Qué es Mesira">
          <p>
            Mesira es un tablero donde personas de la comunidad ofrecen gratis artículos que ya no
            usan. Nosotros ponemos el lugar de encuentro. No somos parte de la entrega, no
            revisamos los artículos, no los tenemos en ningún depósito y no garantizamos que estén
            en el estado que dice la publicación.
          </p>
        </Section>

        <Section title="Todo se regala">
          <p>
            Está prohibido pedir dinero o cualquier otra cosa a cambio de un artículo publicado
            acá, en la publicación o por privado. Si lo hacés, damos de baja la publicación y
            podemos deshabilitar la cuenta.
          </p>
        </Section>

        <Section title="Qué no se puede publicar">
          <ul className="ml-5 list-disc">
            <li>Animales.</li>
            <li>Medicamentos, suplementos y cualquier cosa que se ingiera.</li>
            <li>Armas, explosivos y elementos peligrosos.</li>
            <li>Artículos robados o de origen dudoso.</li>
            <li>Contenido para adultos.</li>
            <li>Cualquier cosa cuya entrega esté prohibida por la ley argentina.</li>
          </ul>
        </Section>

        <Section title="Tu cuenta">
          <p>
            Tenés que entrar con una cuenta de Google real y cargar tu nombre, apellido y celular
            verdaderos. Una cuenta por persona. No podés usar la cuenta de otro ni crear cuentas
            para esquivar una suspensión.
          </p>
        </Section>

        <Section title="Contenido que subís">
          <p>
            Las fotos y los textos que publicás siguen siendo tuyos. Al publicarlos nos autorizás a
            mostrarlos dentro de Mesira y en los avisos que mandamos a quien tenga una alerta que
            coincida. Nada más. Si borrás una publicación, borramos sus fotos.
          </p>
        </Section>

        <Section title="Moderación">
          <p>
            Podemos dar de baja una publicación o deshabilitar una cuenta cuando se rompen estas
            reglas, o cuando hay motivos razonables para pensar que alguien está usando la
            plataforma de mala fe. Si creés que nos equivocamos, escribinos a {SUPPORT} y lo
            revisamos.
          </p>
        </Section>

        <Section title="Responsabilidad">
          <p>
            La entrega la coordinan ustedes. Elegí un lugar donde te sientas cómodo, preferentemente
            durante el día y con gente alrededor, y revisá el artículo antes de llevártelo. Mesira
            no responde por lo que pase durante o después de una entrega, ni por el estado o el
            funcionamiento de lo que se entrega.
          </p>
        </Section>

        <Section title="Cambios">
          <p>
            Si cambiamos algo importante de estas reglas, lo avisamos en la página. Seguir usando
            Mesira después de un cambio significa que lo aceptás.
          </p>
        </Section>

        <Section title="Contacto">
          <p>
            Cualquier duda sobre estos términos:{" "}
            <a href={`mailto:${SUPPORT}`} className="underline underline-offset-4">
              {SUPPORT}
            </a>
            .
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
