import type { KVStore } from '@/lib/adapters/types';

const TTL_SECONDS = 24 * 60 * 60;

export type SubmissionState = 'new' | 'processing' | 'accepted' | 'unavailable';

/**
 * Prevents one submission from being delivered twice — a double click, a retry
 * after a slow response, a flaky network.
 *
 * The client generates `submissionId` once when the form is mounted and reuses it
 * across retries; the server refuses to process the same id twice.
 *
 * This module lost ~140 lines when the in-memory development fallback became a
 * KVStore implementation of its own. There is now a single code path, and the
 * store decides where the state lives.
 */
function key(submissionId: string): string {
  return `lead-submission:v1:${submissionId}`;
}

function parse(value: string | null): SubmissionState {
  return value === 'processing' || value === 'accepted' ? value : 'new';
}

/** Marks the submission as in-flight. Returns the state observed BEFORE reserving. */
export async function reserveSubmission(submissionId: string, store: KVStore): Promise<SubmissionState> {
  try {
    const existing = parse(await store.get(key(submissionId)));
    if (existing !== 'new') return existing;

    await store.set(key(submissionId), 'processing', { ttlSeconds: TTL_SECONDS });
    return 'new';
  } catch {
    return 'unavailable';
  }
}

/** Marks the submission as delivered. */
export async function acceptSubmission(submissionId: string, store: KVStore): Promise<void> {
  try {
    await store.set(key(submissionId), 'accepted', { ttlSeconds: TTL_SECONDS });
  } catch {
    // The lead was delivered; failing to record that must not fail the request.
  }
}

/** Releases the reservation so the visitor can legitimately retry after a failure. */
export async function releaseSubmission(submissionId: string, store: KVStore): Promise<void> {
  try {
    await store.delete(key(submissionId));
  } catch {
    // Nothing to do — the TTL will clear it.
  }
}
