import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';

import { schemaTypes } from './sanity/schemaTypes';

/**
 * Configuration du Studio — l'interface où le client édite son contenu.
 *
 * Le Studio tourne à part du site : `bun run studio` → http://localhost:3333
 * Il lit le même .env que le site.
 */
export default defineConfig({
  name: 'autoecole',
  title: 'Auto-école Trajectoire',

  projectId: process.env.PUBLIC_SANITY_PROJECT_ID ?? '',
  dataset: process.env.PUBLIC_SANITY_DATASET ?? 'production',

  plugins: [structureTool()],
  schema: { types: schemaTypes },
});
