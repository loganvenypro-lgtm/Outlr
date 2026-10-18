/**
 * Title Pattern & Psychology Formats Detector
 * Identifies high-CTR viral title structures (1of10 / TubeLab / Algrow style)
 */

export interface TitlePattern {
  id: string;
  name: string;
  badge: string;
  regex: RegExp;
  template: string;
}

const TITLE_PATTERNS: TitlePattern[] = [
  // 1. Was Right All Along ("IShowSpeed Was Right All Along...", "He Was Right About...")
  {
    id: "was_right",
    name: "Validation & Controverse",
    badge: "👁️ [X] Was Right All Along",
    regex: /\b([\w\s]+)\b\s+(was|were|had been)\s+right\b/i,
    template: "[Person] Was Right All Along...",
  },
  // 2. The Hunt for X ("The Hunt for Lux...", "The Search for...")
  {
    id: "the_hunt_for",
    name: "Enquête & Traque",
    badge: "🕵️ The Hunt for [X]",
    regex: /\b(the (hunt|search) for|à la recherche de|finding the)\b/i,
    template: "The Hunt for [Subject]",
  },
  // 3. Superlative in History / Ever ("Worst line in movie history", "The Most Accurate Ever")
  {
    id: "superlative_history",
    name: "Superlatif Historique",
    badge: "🏆 [Superlative] in History / Ever",
    regex: /\b(in (movie|gaming|internet|youtube|human)?\s*history|ever (made|seen|recorded|created)|dans l'histoire)\b/i,
    template: "The Most [Superlative] in History",
  },
  // 4. Challenge & Duration ("I Spent 100 Days in...", "I Tried X for 30 Days")
  {
    id: "challenge_duration",
    name: "Challenge & Transformation",
    badge: "⏱️ I Tried [X] for [Y]",
    regex: /\b(i (tried|spent|tested|lived|survived|ate|built|worked|trained)|j'ai (passé|tenté|testé|vécu|survécu|construit))\b.*\b(\d+\s*(days?|hours?|months?|weeks?|jours?|heures?|ans?))\b/i,
    template: "I Tried [Topic] for [Duration]",
  },
  // 5. Iceberg / Explained ("The Complete X Iceberg Explained")
  {
    id: "iceberg_explained",
    name: "Iceberg & Décryptage",
    badge: "🧊 [X] Iceberg Explained",
    regex: /\b(iceberg|explained|décrypté|l'histoire de|the story of|the truth about)\b/i,
    template: "The [Topic] Iceberg / Explained",
  },
  // 6. How to / Without ("How to Get Rich Without Working", "Comment X sans Y")
  {
    id: "how_without",
    name: "Bénéfice sans Douleur",
    badge: "🎯 How to [X] Without [Y]",
    regex: /\b(how to|comment)\b.*\b(without|sans)\b/i,
    template: "How to [Goal] without [Obstacle]",
  },
  // 7. How I / How One Guy Built ("How I Made $10,000", "How He Built")
  {
    id: "how_i_built",
    name: "Étude de Cas / Succès",
    badge: "🚀 How [X] Built [Result]",
    regex: /\b(how (i|he|she|one guy|they|this)\b.*\b(made|built|reached|scaled|grew|lost|cracked))\b/i,
    template: "How [Person] achieved [Big Result]",
  },
  // 8. Contrast / Versus ("X vs Y")
  {
    id: "versus_comparison",
    name: "Duel & Comparaison",
    badge: "⚔️ [X] vs [Y]",
    regex: /\b(\$?\d+[\w\s]*\s+(vs\.?|versus|contre)\s+\$?\d+[\w\s]*|[A-Za-z0-9]+\s+(vs\.?|versus|contre)\s+[A-Za-z0-9]+)\b/i,
    template: "[Option A] vs [Option B]",
  },
  // 9. Rise and Fall ("The Rise and Fall of X")
  {
    id: "rise_and_fall",
    name: "Grandeur et Décadence",
    badge: "📉 Rise and Fall of [X]",
    regex: /\b(the rise and (fall|downfall) of|l'ascension et la chute de|the downfall of|what happened to)\b/i,
    template: "The Rise and Fall of [Subject]",
  },
  // 10. Negative Warning / Mistakes ("Do NOT Do This", "Stop Doing X", "7 Mistakes")
  {
    id: "warning_mistakes",
    name: "Avertissement & Erreurs",
    badge: "⚠️ Stop Doing [X] / Mistakes",
    regex: /\b(stop (doing|using|making)|do not|don't|erreurs à éviter|ne faites jamais|never do this|\d+\s*(mistakes|erreurs|pièges))\b/i,
    template: "Stop doing [Mistake] / Don't [Action]",
  },
  // 11. Why X is Actually Y / Secret ("Why X is Actually Dead", "The Secret of X")
  {
    id: "secret_reveal",
    name: "Révélation Contre-Intuitive",
    badge: "🔍 Why [X] is Actually [Y]",
    regex: /\b(why\b.*\b(actually|really|secret|vérité|pourquoi))\b/i,
    template: "Why [Subject] is Actually [Twist]",
  },
  // 12. Top N Things ("Top 10 Things", "7 Secrets", "Top 5")
  {
    id: "top_n_things",
    name: "Top N Things / Liste Chiffrée",
    badge: "🔢 Top [N] Things",
    regex: /\b(top\s*\d+|\d+\s*(things|ways|secrets|tools|methods|tips|facts|astuces|choses|techniques|hacks|raisons|reasons))\b/i,
    template: "Top [N] Things / Ways to [Goal]",
  },
];

export { TITLE_PATTERNS };

/**
 * Detect title pattern and return badge string + template
 */
export function detectTitlePattern(title: string): {
  patternId?: string;
  badge?: string;
  template?: string;
} {
  if (!title) return {};

  for (const p of TITLE_PATTERNS) {
    if (p.regex.test(title)) {
      return {
        patternId: p.id,
        badge: p.badge,
        template: p.template,
      };
    }
  }

  return {};
}
