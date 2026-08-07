# Playbook Builder

A small static web app for turning a manual, step-by-step process into a structured JSON
"playbook" — the kind of context you'd hand to an LLM (Claude) to draft an automation plan
or agent.

**Live site:** https://zudevon.github.io/knowledge-base-website/

## What it does

- Capture playbook-level details: title, objective, process owner, frequency.
- Add as many steps as needed, each with:
  - Name and description
  - Inputs and outputs
  - Tools / systems involved
  - Owner and time/effort
  - Notes / edge cases
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
      "id": "string",
      "name": "string",
      "description": "string",
      "inputs": ["string"],
      "outputs": ["string"],
      "tools": ["string"],
      "owner": "string",
      "effort": "string",
      "notes": "string"
    }
  ],
  "meta": {
    "schemaVersion": 1,
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
