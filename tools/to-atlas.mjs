#!/usr/bin/env node
/**
 * Playbook Builder export  →  IRIS Atlas records
 *
 * The builder is deliberately local-only: it saves nothing anywhere, and the export
 * from the page is the only artifact. That is a good property and this script does
 * not change it. It reads an exported file you already have on disk and emits records
 * for `iris datasets import`, so the browser never gains a credential and the app
 * stays a static site.
 *
 *   node tools/to-atlas.mjs "Weekly Invoice Reconciliation.json" > records.json
 *   iris datasets import records.json -s xart-playbook
 *
 * Re-running is safe: external_id is derived from the playbook title, so a second
 * import of an edited playbook MERGES onto the same row instead of duplicating it.
 *
 * WHY THE ROLLUPS ARE COMPUTED HERE. The Atlas schema carries step_count,
 * delegable_count, blocked_count, unrated_count and lowest_maturity as real columns
 * so a dashboard can group and filter on them without parsing JSON per row. They are
 * derived from `steps`, never hand-entered — a hand-maintained count is a count that
 * silently goes stale, which is a mistake we have already made on a client dashboard.
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const MATURITY = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4 };

/** "Weekly Invoice Reconciliation" → "weekly-invoice-reconciliation" */
function slugify(s) {
    return String(s || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80) || 'untitled-playbook';
}

function toRecord(doc, sourceFile) {
    const pb = doc.playbook ?? {};
    const steps = Array.isArray(doc.steps) ? doc.steps : [];

    // A level is only "known" if it maps to L0–L4. An empty string is UNRATED, not L0 —
    // conflating them would report an uncaptured step as a fully manual one.
    const levels = steps
        .map((s) => MATURITY[s?.maturity?.level])
        .filter((n) => Number.isInteger(n));

    const verdictOf = (s) => String(s?.delegationVerdict?.verdict || '').toUpperCase();

    const rated = steps.filter(
        (s) => Number.isInteger(MATURITY[s?.maturity?.level]) && verdictOf(s) !== '',
    );

    return {
        external_id: slugify(pb.title),
        data: {
            title: pb.title || '(untitled)',
            playbook_id: slugify(pb.title),
            version: Number(doc?.meta?.schemaVersion ?? 1),
            objective: pb.objective || '',
            process_owner: pb.owner || '',
            captured_by: pb.capturedBy || '',
            frequency: pb.frequency || '',
            captured_at: doc?.meta?.exportedAt || null,

            step_count: steps.length,
            delegable_count: steps.filter((s) => verdictOf(s) === 'AGENT').length,
            // "Blocked below L2" — a step that is documented but not yet reliable enough
            // to hand off. L0/L1 only; unrated steps are counted separately, not here.
            blocked_count: levels.filter((n) => n < 2).length,
            unrated_count: steps.length - rated.length,
            lowest_maturity: levels.length ? Math.min(...levels) : null,

            // The full capture, verbatim. The columns above exist for grouping; this is
            // the source of truth, so nothing the builder captures is lost in transit.
            steps: JSON.stringify(steps),

            source: 'playbook-builder',
            source_file: sourceFile,
            schema_version: Number(doc?.meta?.schemaVersion ?? 1),
        },
    };
}

const files = process.argv.slice(2);
if (!files.length) {
    console.error('usage: node tools/to-atlas.mjs <exported-playbook.json> [more.json …] > records.json');
    process.exit(1);
}

const records = [];
for (const f of files) {
    let doc;
    try {
        doc = JSON.parse(readFileSync(f, 'utf8'));
    } catch (e) {
        console.error(`✗ ${f}: not readable JSON — ${e.message}`);
        process.exit(1);
    }
    if (!doc.playbook || !Array.isArray(doc.steps)) {
        console.error(`✗ ${f}: not a Playbook Builder export (needs "playbook" and "steps")`);
        process.exit(1);
    }
    const rec = toRecord(doc, basename(f));
    records.push(rec);
    // Progress goes to stderr so `> records.json` stays clean JSON.
    console.error(
        `✓ ${rec.data.title} — ${rec.data.step_count} steps, ` +
            `${rec.data.delegable_count} delegable, ${rec.data.unrated_count} unrated`,
    );
}

process.stdout.write(JSON.stringify({ records }, null, 2) + '\n');
