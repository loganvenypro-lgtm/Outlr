import type { Metadata } from "next";
import Link from "next/link";
import { ContactLink, LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — Outlr",
  description: "Les conditions d'utilisation d'Outlr.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Conditions d'utilisation">
      <section>
        <p>
          Ces conditions encadrent l&apos;utilisation d&apos;Outlr, un outil d&apos;analyse de chaînes et de vidéos YouTube
          publiques. En créant un compte, tu les acceptes.
        </p>
      </section>

      <section>
        <h2>YouTube</h2>
        <p>
          Outlr utilise les services d&apos;API YouTube. En utilisant Outlr, tu acceptes d&apos;être lié par les{" "}
          <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">
            conditions d&apos;utilisation de YouTube
          </a>
          . Outlr n&apos;est ni affilié à YouTube ni approuvé par YouTube ou Google. YouTube est une marque de Google LLC.
        </p>
      </section>

      <section>
        <h2>Le service</h2>
        <ul>
          <li>Outlr affiche des statistiques publiques et des analyses calculées à partir de ces statistiques.</li>
          <li>
            Les estimations (revenus, audience, explications générées par l&apos;IA) sont indicatives et peuvent être
            inexactes.
          </li>
          <li>Le service peut évoluer, être interrompu ou limité, notamment selon les quotas de l&apos;API YouTube.</li>
        </ul>
      </section>

      <section>
        <h2>Ton compte</h2>
        <ul>
          <li>Tu es responsable de la confidentialité de ton mot de passe.</li>
          <li>
            Tu t&apos;engages à ne pas utiliser Outlr pour collecter massivement des données, contourner les limites de
            YouTube ou porter atteinte aux droits d&apos;un créateur.
          </li>
          <li>Nous pouvons suspendre un compte qui ne respecte pas ces conditions.</li>
        </ul>
      </section>

      <section>
        <h2>Données personnelles</h2>
        <p>
          La façon dont nous traitons tes données est décrite dans la <Link href="/privacy">politique de confidentialité</Link>.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Pour toute question : <ContactLink />.
        </p>
      </section>
    </LegalPage>
  );
}
