import { sanityClient } from 'sanity:client';
import { defineQuery } from 'groq';

import { avisSchema } from '@/content/schemas';

/**
 * Lecture du contenu Sanity, AU BUILD uniquement.
 *
 * Le site reste statique : Sanity est lu pendant `bun run build`, jamais quand
 * un visiteur charge la page. Le client publie → un rebuild se déclenche.
 *
 * Ce fichier est le seul à parler à Sanity (règle I13 : les SDK fournisseurs
 * restent dans src/lib/adapters/).
 */

// `defineQuery` au lieu d'une string : nécessaire pour typer la requête avec TypeGen.
// La projection est explicite — on ne demande jamais tout le document.
const AVIS_QUERY = defineQuery(`
  *[_type == "avis"] | order(ordre asc) {
    prenom,
    formation,
    date,
    comment
  }
`);

const configured = Boolean(import.meta.env.PUBLIC_SANITY_PROJECT_ID);

/**
 * Renvoie les avis Sanity, ou `null` si Sanity n'est pas branché
 * (l'appelant retombe alors sur src/content/autoecole.json).
 */
export async function getAvisFromSanity() {
  if (!configured) return null;

  const data = await sanityClient.fetch(AVIS_QUERY);

  // Dataset vide (juste après le branchement) : on retombe sur le JSON plutôt
  // que d'afficher une section d'avis blanche.
  if (!Array.isArray(data) || data.length === 0) return null;

  // Même schéma Zod que le fichier JSON : le CMS doit respecter le contrat,
  // pas l'inverse. Un champ manquant fait échouer le build, pas la page.
  const result = avisSchema.array().safeParse(data);
  if (!result.success) {
    throw new Error(`Avis Sanity invalides :\n${result.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n')}`);
  }

  return result.data;
}
