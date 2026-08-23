import { defineCliConfig } from 'sanity/cli';

// Config lue par la CLI (`bun run studio`, `sanity deploy`, `sanity dataset ...`).
export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
  },
});
