/**
 * Re-export shim for backward compatibility during the FSD refactor.
 * New code MUST import from '@/shared/config' directly.
 * This file will be removed in Phase 9 once all importers are migrated.
 */
export * from './shared/config';
