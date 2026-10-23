import assert from "node:assert/strict";
import { searchPages, textFlags } from "./classical-corpus.mjs";

export function createReviewQueue(corpus, plan, records) {
  const ids = new Set();
  const exact = new Map(records.filter(page => page.exactTextPageId).map(page => [page.exactTextPageId, page.id]));
  return { schemaVersion: 1, textRevision: corpus.manifest.revision,
    note: plan.note, sampleLimitPerTerm: 12, families: plan.families.map(family => {
      assert.ok(!ids.has(family.id), "Duplicate review family"); ids.add(family.id);
      assert.ok(family.terms.length && family.volumes.length);
      return { ...family, status: "PENDING_SOURCE_REVIEW", terms: family.terms.map(term => {
        const hits = searchPages(corpus, [term], family.volumes);
        return { term, totalHits: hits.length, truncated: hits.length > 12,
          missingTranscriptVolumesInScope: corpus.missingVolumes.filter(volume => family.volumes.includes(volume)),
          samples: hits.slice(0, 12).map(page => ({ textPageId: page.id, volume: page.volume, leaf: page.leaf,
            ambiguousLeaf: page.ambiguousLeaf, verifiedScanId: exact.get(page.id) ?? null,
            flags: textFlags(page.text, page.volume) })) };
      }) };
    }) };
}
