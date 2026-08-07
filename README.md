# Playbook Builder

A small static web app for turning a manual, step-by-step process into a structured JSON
"playbook" — the kind of context you'd hand to an LLM (Claude) to draft an automation plan
or agent.

**Live site:** https://zudevon.github.io/knowledge-base-website/

## What it does

- Capture playbook-level details: title, objective, process owner, frequency.
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
- Reorder, edit, or delete steps at any time.
- **Import JSON** — load a previously exported playbook (or `sample-playbook.json`) back
  into the form to keep editing it.
- **Export JSON** — download the current playbook as a `.json` file.
- **Copy Claude Prompt** — copies the playbook JSON wrapped in a ready-to-paste prompt for
  Claude (or any LLM) asking it to propose an automation plan.
- Work is autosaved to `localStorage` in your browser as you type, so a refresh won't lose
  your progress — but only Export produces a durable file.

No build step, no dependencies — plain HTML/CSS/JS, deployable as-is to GitHub Pages.

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
      "evalQuestion": "string"
    }
  ],
  "meta": {
    "schemaVersion": 2,
    "exportedAt": "ISO 8601 timestamp"
  }
}
```

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
