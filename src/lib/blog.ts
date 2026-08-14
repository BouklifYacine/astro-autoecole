import type { CollectionEntry } from 'astro:content';

export type BlogEntry = CollectionEntry<'blog'>;

/**
 * Published posts, newest first.
 *
 * getCollection() has no guaranteed order — unsorted output looks fine locally and
 * reorders itself on another machine, which silently shuffles paginated URLs. The
 * sort is not optional.
 *
 * Drafts are excluded in production only, so they stay reviewable in dev.
 */
export function visiblePosts(entries: BlogEntry[]): BlogEntry[] {
  return entries
    .filter((entry) => !entry.data.draft || import.meta.env.DEV)
    .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());
}
