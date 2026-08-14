import type { BlogEntry } from "./blog";

export function validateBlogEntry(post: BlogEntry): string[] {
  const errors: string[] = [];
  if (post.data.primaryKeyword && post.data.primaryKeyword.trim().length < 2) {
    errors.push("Le mot-clé principal est trop court.");
  }
  return errors;
}
