import raw from '@/content/autoecole.json';
import { autoEcoleSchema, type AutoEcoleData } from '@/content/schemas';
import { FORMATION_OPTIONS } from '@/config/site.config';

/**
 * Loads and validates the landing page content.
 *
 * Same contract as `defineSite` (src/config/schema.ts): malformed content fails
 * the build with a readable message rather than rendering a hole in the page.
 */
function loadAutoEcole(): AutoEcoleData {
  const result = autoEcoleSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid src/content/autoecole.json:\n${issues}`);
  }

  // The lead API validates `formation` against site.config's option list
  // (src/lib/forms/schema.ts, `select` case). A card offering a formation the
  // server would reject is a silent 400 at submit time, so it is caught here.
  const allowed = new Set<string>(FORMATION_OPTIONS);
  const drifted = result.data.formations
    .map((formation) => formation.formValue)
    .filter((value) => !allowed.has(value));

  if (drifted.length > 0) {
    throw new Error(
      `src/content/autoecole.json: formValue absent de FORMATION_OPTIONS (site.config.ts) : ${drifted.join(', ')}`,
    );
  }

  return result.data;
}

export const autoecole = loadAutoEcole();
