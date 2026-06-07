import { Meilisearch, type Index } from 'meilisearch';
import { env } from '../env.js';

// Test ortamında Meili devre dışı — aramalar Postgres'e düşer (deterministik testler).
const enabled = env.NODE_ENV !== 'test' && !!env.MEILISEARCH_HOST;

export const searchClient: Meilisearch | null = enabled
  ? new Meilisearch({ host: env.MEILISEARCH_HOST!, apiKey: env.MEILISEARCH_API_KEY })
  : null;

export const SEARCH_INDEXES = {
  users: 'users',
  hashtags: 'hashtags',
  events: 'events',
  communities: 'communities',
} as const;

export type SearchIndexName = (typeof SEARCH_INDEXES)[keyof typeof SEARCH_INDEXES];

export function isSearchEnabled(): boolean {
  return searchClient !== null;
}

export function getIndex(name: SearchIndexName): Index | null {
  return searchClient ? searchClient.index(name) : null;
}

/**
 * Index ayarlarını kurar (idempotent). Her index university_id ile filtrelenebilir
 * — çapraz-üniversite sızıntısı engellenir.
 */
export async function ensureSearchIndexes(): Promise<void> {
  if (!searchClient) return;
  const common = {
    filterableAttributes: ['universityId', 'type', 'domain'],
    sortableAttributes: ['usageCount', 'startsAt'],
  };
  await searchClient.createIndex(SEARCH_INDEXES.users, { primaryKey: 'id' }).catch(() => {});
  await searchClient.createIndex(SEARCH_INDEXES.hashtags, { primaryKey: 'id' }).catch(() => {});
  await searchClient.createIndex(SEARCH_INDEXES.events, { primaryKey: 'id' }).catch(() => {});
  await searchClient.createIndex(SEARCH_INDEXES.communities, { primaryKey: 'id' }).catch(() => {});

  await searchClient.index(SEARCH_INDEXES.users).updateSettings({
    searchableAttributes: ['username', 'displayName', 'bio', 'careerHeadline'],
    filterableAttributes: ['universityId', 'type'],
  });
  await searchClient.index(SEARCH_INDEXES.hashtags).updateSettings({
    searchableAttributes: ['tag'],
    ...common,
  });
  await searchClient.index(SEARCH_INDEXES.events).updateSettings({
    searchableAttributes: ['title', 'description', 'locationText'],
    ...common,
  });
  await searchClient.index(SEARCH_INDEXES.communities).updateSettings({
    searchableAttributes: ['name', 'description', 'category'],
    filterableAttributes: ['universityId', 'visibility'],
  });
}
