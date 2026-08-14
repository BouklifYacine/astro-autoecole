import { defineField, defineType } from 'sanity';

/**
 * Un avis client.
 *
 * `defineType` / `defineField` : la façon officielle d'écrire un schéma Sanity.
 * Ça donne l'autocomplétion dans le Studio et permet de générer les types TS.
 */
export const avis = defineType({
  // `name` = le type qu'on interrogera en GROQ : *[_type == "avis"]
  name: 'avis',
  title: 'Avis client',
  type: 'document',

  fields: [
    defineField({
      name: 'prenom',
      title: 'Prénom et initiale',
      type: 'string',
      description: 'Ex. « Léa M. » — jamais le nom complet.',
      // La validation vit sur le champ : le Studio bloque avant publication.
      validation: (rule) => rule.required().max(40),
    }),

    defineField({
      name: 'formation',
      title: 'Formation suivie',
      type: 'string',
      // Les mêmes valeurs que src/config/site.config.ts → FORMATION_OPTIONS.
      options: {
        list: [
          'Permis B — boîte manuelle',
          'Permis B — boîte automatique',
          'Conduite accompagnée (AAC)',
          'Conduite supervisée',
          'Code de la route',
          'Reprise de conduite',
        ],
      },
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'date',
      title: 'Date',
      type: 'string',
      description: 'Ex. « mars 2026 ».',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'comment',
      title: 'Commentaire',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required().min(40).max(400),
    }),

    defineField({
      name: 'ordre',
      title: 'Ordre d’affichage',
      type: 'number',
      description: 'Le plus petit apparaît en premier.',
      initialValue: 100,
    }),
  ],

  // Ce que tu vois dans la liste du Studio.
  preview: {
    select: { title: 'prenom', subtitle: 'formation' },
  },
});
