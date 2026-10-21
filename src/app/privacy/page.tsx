import type { Metadata } from "next";
import { ContactLink, LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Outlr",
  description: "Comment Outlr utilise les services d'API YouTube et les données de ses utilisateurs.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Politique de confidentialité">
      <section>
        <p>
          Outlr est un outil d&apos;analyse de chaînes et de vidéos YouTube publiques. Cette page explique quelles données nous
          utilisons, pourquoi, combien de temps nous les gardons et comment les faire supprimer.
        </p>
      </section>

      <section>
        <h2>Services d&apos;API YouTube</h2>
        <p>
          Outlr utilise les services d&apos;API YouTube (YouTube API Services) pour afficher des informations publiques sur les
          chaînes et les vidéos : titres, miniatures, nombre de vues, de « j&apos;aime », de commentaires et d&apos;abonnés.
          En utilisant Outlr, tu acceptes aussi les{" "}
          <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">
            conditions d&apos;utilisation de YouTube
          </a>
          . Les données YouTube sont aussi soumises à la{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
            règle de confidentialité de Google
          </a>
          .
        </p>
        <p className="mt-3">
          Outlr n&apos;accède jamais à ton compte YouTube ou Google : nous n&apos;utilisons pas de connexion Google (OAuth) et
          ne lisons aucune donnée privée. Seules des données publiques sont demandées, avec une clé d&apos;API.
        </p>
      </section>

      <section>
        <h2>Données que nous collectons</h2>
        <ul>
          <li>Ton compte : nom, adresse email et mot de passe (stocké chiffré, jamais en clair).</li>
          <li>
            Tes choix dans l&apos;app : la chaîne YouTube que tu indiques comme la tienne, les concurrents que tu choisis, tes
            dossiers et les vidéos ou chaînes que tu y enregistres.
          </li>
          <li>
            Des statistiques d&apos;usage anonymisées (pages vues, étapes de l&apos;inscription) via PostHog, pour améliorer le
            produit.
          </li>
          <li>Des données publiques YouTube sur les chaînes et vidéos analysées (voir ci-dessus).</li>
        </ul>
      </section>

      <section>
        <h2>Utilisation des données</h2>
        <p>
          Ces données servent uniquement à faire fonctionner Outlr : trouver les vidéos qui performent au-dessus de la moyenne
          d&apos;une chaîne, suggérer des concurrents et afficher l&apos;évolution des statistiques. Nous ne vendons et ne
          partageons aucune donnée avec des annonceurs. Les seuls prestataires qui traitent des données pour notre compte sont
          notre hébergeur, notre base de données, PostHog (statistiques d&apos;usage) et Groq (génération des explications IA à
          partir de données publiques de chaînes).
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          Un cookie de session (<code>outlr_session</code>) te garde connecté pendant 7 jours. PostHog utilise un cookie pour
          mesurer l&apos;usage de manière anonyme.
        </p>
      </section>

      <section>
        <h2>Conservation</h2>
        <p>
          Les données publiques YouTube sont rafraîchies régulièrement auprès de l&apos;API. Les données de ton compte sont
          gardées tant que ton compte existe.
        </p>
      </section>

      <section>
        <h2>Supprimer tes données</h2>
        <p>
          Tu peux supprimer tes dossiers à tout moment depuis l&apos;app. Pour supprimer ton compte et toutes les données qui y
          sont liées, écris-nous à <ContactLink />. La suppression est faite sous 7 jours. Tu peux aussi consulter les
          autorisations accordées aux applications sur{" "}
          <a href="https://security.google.com/settings/security/permissions" target="_blank" rel="noreferrer">
            la page de sécurité de ton compte Google
          </a>{" "}
          (Outlr n&apos;en demande aucune).
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Pour toute question sur cette politique : <ContactLink />.
        </p>
      </section>
    </LegalPage>
  );
}
