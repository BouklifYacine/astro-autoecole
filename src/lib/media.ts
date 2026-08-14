import type { ImageMetadata } from 'astro';

/**
 * Resolves a filename from the content file to a processed image.
 *
 * `astro:assets` needs a static import to hash, resize and re-encode an image,
 * which a string in a JSON file cannot provide. `import.meta.glob` with
 * `eager: true` bridges the two: Vite resolves every file in the folder at build
 * time, and the content keeps naming photos instead of importing them.
 *
 * Nothing is lazy here on purpose — the map is built at build time and adds no
 * client JavaScript.
 */
const photos = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/photos/*.{jpg,jpeg,png,webp,avif}',
  { eager: true },
);

export function resolvePhoto(file?: string): ImageMetadata | undefined {
  if (!file) return undefined;

  const entry = photos[`/src/assets/photos/${file}`];

  // A typo in the content file would otherwise render a silently empty frame.
  if (!entry) {
    const available = Object.keys(photos)
      .map((path) => path.split('/').pop())
      .join(', ');
    throw new Error(
      `Photo introuvable : src/assets/photos/${file}. Disponibles : ${available || '(aucune)'}`,
    );
  }

  return entry.default;
}
