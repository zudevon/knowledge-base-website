# Playbook Builder

A small static web app for turning a manual, step-by-step process into a structured JSON
"playbook" — the kind of context you'd hand to an LLM (Claude) to draft an automation plan
or agent.

**Live site:** https://zudevon.github.io/knowledge-base-website/

## What it does

- Capture playbook-level details: title, objective, process owner, frequency, and **captured by**
  (who filled the form in, which is often not who owns the process).
- Add as many steps as needed, each documenting:
  - **ID & Name** — stable identifier, verb-first name
  - **Trigger** — what starts it: event, date, threshold, or request
  - **Inputs** — data, files, people, tools required to begin
  - **Sequence** — ordered steps, as actually performed, not idealized
  - **Decision Rules** — thresholds, gates, and heuristics with real values
  - **Standard of Done** — the quality bar; what makes output acceptable
  - **Vetoes** — what kills it outright; hard "no"s
  - **Failure Modes** — how it has gone wrong, from evidence
  - **Artifacts** — what it produces; naming and versioning convention
  - **Dependencies** — upstream/downstream SOPs, people, systems
  - **Tacit Layer** — the unstated judgment the evidence implies is applied
  - **Maturity** — L0–L4, plus the specific next action to advance one level
  - **Delegation Verdict** — AGENT / ASSISTED / HUMAN-ONLY, with reason
  - **Eval Question** — a testable question for checking correct execution
  - **Custom Metadata** — free-form `key: value` pairs for anything the schema doesn't cover
- Steps collapse to a one-line summary (name + Delegation Verdict + Maturity badges) by
  default, so a long playbook stays scannable; click a step to expand it. Use **Expand All** /
  **Collapse All** to toggle everything at once.
- Reorder, edit, or delete steps at any time.
- **Import JSON** — load a previously exported playbook (or `sample-playbook.json`) back
  into the form to keep editing it.
- **Export JSON** — download the current playbook as a `.json` file.
- **Copy Claude Prompt** — copies the playbook JSON wrapped in a ready-to-paste prompt for
  Claude (or any LLM) asking it to propose an automation plan.
- **Process Flow** — a diagram at the bottom of the page, auto-built from your steps in
  order (using [Drawflow](https://github.com/jerosoler/Drawflow)), color-coded by Delegation
  Verdict. Drag nodes to rearrange them — positions are remembered in this browser. Pan by
  dragging the canvas background, zoom with the +/− buttons, and use **Export PNG** to save
  an image of the diagram. Node text updates live as you edit a step's name, verdict, or
  maturity; use **Refresh from Steps** after adding, removing, or reordering steps to resync
  the diagram's structure.
- Work is autosaved to `localStorage` in your browser as you type, so a refresh won't lose
  your progress — but only Export produces a durable file. The toolbar shows whether the
  current content has been exported yet, and closing the tab with unexported changes prompts
  first. (Flow chart node positions are also autosaved locally, but are intentionally left
  out of the exported JSON since they're a display detail, not process content an LLM needs.)

No build step — plain HTML/CSS/JS. The only external dependencies are two small libraries
loaded from a CDN for the flow chart (Drawflow for the diagram, html2canvas for PNG export);
everything else is dependency-free and deployable as-is to GitHub Pages.

## Playbook identity

Every playbook carries a stable `playbookId` (minted once, shown read-only in the form) and an
integer `version` that increments on each export. Together they let anything downstream — a
script, an agent, a database — tell **an updated playbook apart from a brand new one**.

Without this, two exports from the same person are indistinguishable: a re-import either creates
a duplicate record or blindly overwrites, and there is no way to know which file is newer.

- Exporting bumps the version and names the file `<title>.v<n>.json`.
- Re-importing an exported file **continues that playbook's lineage** — same id, version carries
  on from where it was.
- Files predating this field (including `sample-playbook.json`) still import fine; they are
  assigned a fresh id and start at version 0.

## JSON schema

```json
{
  "playbook": {
    "title": "string",
    "objective": "string",
    "owner": "string",
    "frequency": "string"
  },
  "steps": [
    {
      "id": "string (stable identifier)",
      "name": "string (verb-first)",
      "trigger": "string",
      "inputs": ["string"],
      "sequence": ["string"],
      "decisionRules": ["string"],
      "standardOfDone": "string",
      "vetoes": ["string"],
      "failureModes": ["string"],
      "artifacts": ["string"],
      "dependencies": ["string"],
      "tacitLayer": "string",
      "maturity": { "level": "L0|L1|L2|L3|L4", "nextAction": "string" },
      "delegationVerdict": { "verdict": "AGENT|ASSISTED|HUMAN-ONLY", "reason": "string" },
      "evalQuestion": "string",
      "metadata": { "any-key": "any-value" }
    }
  ],
  "meta": {
    "schemaVersion": 2,
    "exportedAt": "ISO 8601 timestamp"
  }
}
```

Flow chart node positions live in `localStorage` alongside the form data, but are not part of
this exported shape — they're a local display preference, not playbook content.

See [`sample-playbook.json`](sample-playbook.json) for a filled-out example — import it on
the site to see the app in action.

## Local development

This is a static site with no build step. Serve the folder with anything that speaks HTTP,
for example:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deployment

The site is deployed via GitHub Pages from the `main` branch root.

## Embedding it

The builder is a static page, so it drops into an iframe. Two URL parameters exist for that case,
because an embedded copy cannot reach this origin's `localStorage` to be told what the host looks
like:

| param | values | effect |
|---|---|---|
| `theme` | `light` \| `dark` | Forces the theme for that load. Does **not** overwrite the visitor's stored choice, so opening the tool directly afterwards still respects it. |
| `accent` | six hex digits, e.g. `0b8f63` | Retints `--accent` so the tool carries the host's brand. |

```html
<iframe src="https://zudevon.github.io/knowledge-base-website/?theme=light&accent=0b8f63"></iframe>
```

Precedence for theme is URL, then stored choice, then `prefers-color-scheme`. Only the accent is
themeable — the semantic colours (ok / warn, and the delegation axis) each mean one fixed thing and
are deliberately not exposed.
