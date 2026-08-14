# Sending a playbook to IRIS Atlas

The builder stays local-only. Nothing is saved anywhere, the export from the page is
the only artifact, and **this path does not post from the browser** — that would mean
shipping a write credential to a static site. You export a file, then push the file.

## One playbook

```bash
node tools/to-atlas.mjs "weekly-invoice-reconciliation.json" > records.json
iris datasets import records.json -s xart-playbook
```

## Several at once

```bash
node tools/to-atlas.mjs exports/*.json > records.json
iris datasets import records.json -s xart-playbook
```

## Check before you write

```bash
iris datasets import records.json -s xart-playbook --dry-run
```

## Re-running is safe

`external_id` is derived from the playbook title, so importing an edited playbook
**merges onto the same record**. Verified:

```
first run   Created 1 · Merged 0 · Total 1
second run  Created 0 · Merged 1 · Total 1
```

Rename the playbook and you get a new record — the title *is* the identity.

## What lands in Atlas

The full step capture goes into `steps` as JSON, verbatim, so nothing the builder
captures is lost. Alongside it are columns that exist so a dashboard can group and
filter without parsing JSON on every row:

| Column | Meaning |
|---|---|
| `step_count` | steps in the playbook |
| `delegable_count` | steps whose verdict is `AGENT` |
| `blocked_count` | steps rated **below L2** — documented, not yet reliable enough to hand off |
| `unrated_count` | steps missing a maturity level or a delegation verdict |
| `lowest_maturity` | weakest link, 0–4 (`null` if nothing is rated) |

These are **computed on every import**, never typed. A hand-maintained count is a count
that goes stale quietly.

One deliberate distinction: an empty maturity level counts as **unrated**, not as L0.
Treating "nobody has assessed this yet" as "fully manual" would make an uncaptured step
look like a known-bad one, and the two need different follow-up.

## Reading it back

```bash
iris datasets records list -s xart-playbook
iris datasets api xart-playbook          # REST endpoints for this dataset
```

## Field mapping

| Export | Atlas |
|---|---|
| `playbook.title` | `title`, and `playbook_id` (slugified) |
| `playbook.objective` | `objective` |
| `playbook.owner` | `process_owner` |
| `playbook.frequency` | `frequency` |
| `meta.schemaVersion` | `version`, `schema_version` |
| `meta.exportedAt` | `captured_at` |
| `steps[]` | `steps` (JSON) + the derived columns above |
