import raw from '@/content/autoecole.json';
import type { ContentSource } from '../types';

/**
 * The default content source: the JSON file in src/content/.
 *
 * Keeps a fresh clone building with no .env and no external account, which is
 * rule 2 of the boilerplate. Also the source of truth for any project where the
 * client will never edit anything themselves — most of them.
 */
export function filesContent(): ContentSource {
  return {
    name: 'files',
    async fetchAutoEcole() {
      return raw;
    },
  };
}
