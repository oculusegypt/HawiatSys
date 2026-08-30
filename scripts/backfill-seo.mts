#!/usr/bin/env node
/**
 * Explicit SEO data migration used before sitemap/prerender generation.
 * Runtime requests must remain read-only with respect to SEO metadata.
 */
import { backfillSeoMetadata } from "../artifacts/api-server/src/lib/seoMetadata";

const result = await backfillSeoMetadata();
console.log(`SEO metadata backfill complete: ${result.updated} record(s) updated`);