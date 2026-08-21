(() => {
  const STORAGE_KEY = 'playbookBuilder.state.v1';
  const THEME_KEY = 'playbookBuilder.theme';
  const SCHEMA_VERSION = 2;

  const els = {
    title: document.getElementById('playbookTitle'),
    objective: document.getElementById('playbookObjective'),
    owner: document.getElementById('playbookOwner'),
    frequency: document.getElementById('playbookFrequency'),
    stepsContainer: document.getElementById('stepsContainer'),
    emptyState: document.getElementById('emptyState'),
    addStepBtn: document.getElementById('addStepBtn'),
    expandAllBtn: document.getElementById('expandAllBtn'),
    collapseAllBtn: document.getElementById('collapseAllBtn'),
    newPlaybookBtn: document.getElementById('newPlaybookBtn'),
    importInput: document.getElementById('importInput'),
    exportBtn: document.getElementById('exportBtn'),
    copyPromptBtn: document.getElementById('copyPromptBtn'),
    togglePreviewBtn: document.getElementById('togglePreviewBtn'),
    jsonPreview: document.getElementById('jsonPreview'),
    atlasHint: document.getElementById('atlasHint'),
    atlasCmd: document.getElementById('atlasCmd'),
    copyAtlasCmdBtn: document.getElementById('copyAtlasCmdBtn'),
    statusMsg: document.getElementById('statusMsg'),
    stepTemplate: document.getElementById('stepTemplate'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    flowCanvas: document.getElementById('flowCanvas'),
    flowEmptyState: document.getElementById('flowEmptyState'),
    flowRefreshBtn: document.getElementById('flowRefreshBtn'),
    flowZoomInBtn: document.getElementById('flowZoomInBtn'),
    flowZoomOutBtn: document.getElementById('flowZoomOutBtn'),
    flowResetViewBtn: document.getElementById('flowResetViewBtn'),
    flowExportPngBtn: document.getElementById('flowExportPngBtn'),
    capturedBy: document.getElementById('playbookCapturedBy'),
    playbookIdDisplay: document.getElementById('playbookIdDisplay'),
    exportState: document.getElementById('exportState'),
    shape: document.getElementById('playbookShape'),
    shapeBar: document.getElementById('shapeBar'),
    shapeRead: document.getElementById('shapeRead'),
  };

  const expandedStepIds = new Set();

  let state = loadState() || makeEmptyState();

  function makeEmptyState() {
    return {
      playbook: {
        playbookId: newPlaybookId(),
        version: 0,
        title: '',
        objective: '',
        owner: '',
        frequency: '',
        capturedBy: '',
        capturedAt: new Date().toISOString(),
      },
      steps: [],
      flowLayout: {},
      // Local bookkeeping only — deliberately excluded from buildExportObject().
      local: { lastExportSignature: null },
    };
  }

  function newPlaybookId() {
    return 'pb-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function makeEmptyStep() {
    return {
      id: uid(),
      stepId: '',
      name: '',
      trigger: '',
      inputs: [],
      sequence: [],
      decisionRules: [],
      standardOfDone: '',
      vetoes: [],
      failureModes: [],
      artifacts: [],
      dependencies: [],
      tacitLayer: '',
      maturityLevel: '',
      maturityNextAction: '',
      delegationVerdict: '',
      delegationReason: '',
      evalQuestion: '',
      metadata: {},
    };
  }

  function uid() {
    return 'step-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function linesToArray(text) {
    return String(text || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function arrayToLines(arr) {
    return Array.isArray(arr) ? arr.join('\n') : '';
  }

  function linesToKeyValueObject(text) {
    const obj = {};
    linesToArray(text).forEach((line) => {
      const idx = line.indexOf(':');
      if (idx === -1) {
        obj[line.trim()] = '';
        return;
      }
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (key) obj[key] = value;
    });
    return obj;
  }

  function keyValueObjectToLines(obj) {
    if (!obj || typeof obj !== 'object') return '';
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
  }

  function verdictSlug(v) {
    return String(v || '')
      .toLowerCase()
      .replace(/[^a-z]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---- Rendering ----
  function renderAll() {
    els.title.value = state.playbook.title || '';
    els.objective.value = state.playbook.objective || '';
    els.owner.value = state.playbook.owner || '';
    els.frequency.value = state.playbook.frequency || '';
    els.capturedBy.value = state.playbook.capturedBy || '';
    els.playbookIdDisplay.value = state.playbook.playbookId || '';
    renderSteps();
    updatePreview();
    updateExportState();
  }

  function renderSteps() {
    els.stepsContainer.innerHTML = '';
    els.emptyState.hidden = state.steps.length !== 0;

    state.steps.forEach((step, index) => {
      const node = els.stepTemplate.content.firstElementChild.cloneNode(true);
      node.dataset.id = step.id;
      node.querySelector('.step-number').textContent = 'Step ' + (index + 1);
      node.querySelector('.step-id-field').value = step.stepId || '';
      node.querySelector('.step-name').value = step.name || '';
      node.querySelector('.step-trigger').value = step.trigger || '';
      node.querySelector('.step-inputs').value = arrayToLines(step.inputs);
      node.querySelector('.step-sequence').value = arrayToLines(step.sequence);
      node.querySelector('.step-decision-rules').value = arrayToLines(step.decisionRules);
      node.querySelector('.step-standard-of-done').value = step.standardOfDone || '';
      node.querySelector('.step-vetoes').value = arrayToLines(step.vetoes);
      node.querySelector('.step-failure-modes').value = arrayToLines(step.failureModes);
      node.querySelector('.step-artifacts').value = arrayToLines(step.artifacts);
      node.querySelector('.step-dependencies').value = arrayToLines(step.dependencies);
      node.querySelector('.step-tacit-layer').value = step.tacitLayer || '';
      node.querySelector('.step-maturity-level').value = step.maturityLevel || '';
      node.querySelector('.step-maturity-next-action').value = step.maturityNextAction || '';
      node.querySelector('.step-delegation-verdict').value = step.delegationVerdict || '';
      node.querySelector('.step-delegation-reason').value = step.delegationReason || '';
      node.querySelector('.step-eval-question').value = step.evalQuestion || '';
      node.querySelector('.step-metadata').value = keyValueObjectToLines(step.metadata);

      node.querySelector('.move-up-btn').disabled = index === 0;
      node.querySelector('.move-down-btn').disabled = index === state.steps.length - 1;

      const isExpanded = expandedStepIds.has(step.id);
      const toggleBtn = node.querySelector('.step-summary-toggle');
      const body = node.querySelector('.step-body');
      body.hidden = !isExpanded;
      toggleBtn.setAttribute('aria-expanded', String(isExpanded));
      toggleBtn.querySelector('.chevron').textContent = isExpanded ? '▾' : '▸';

      els.stepsContainer.appendChild(node);
      updateStepSummary(node, step);
    });

    renderShape();
  }

  // L0-L4 as a level, not just a string: the gap is visible without reading the value.
  function maturityNumber(step) {
    const m = /L([0-4])/.exec(step.maturityLevel || '');
    return m ? Number(m[1]) : null;
  }

  const MATURITY_READY = 2;

  // The automation picture. Every field this needs is already on the steps — without
  // drawing it you can only get this by reading all of them and holding it in your head.
  function renderShape() {
    if (!els.shape) return;
    const steps = state.steps;
    if (steps.length < 2) {
      els.shape.hidden = true;
      return;
    }
    els.shape.hidden = false;

    els.shapeBar.innerHTML = steps
      .map((s) => {
        const v = (s.delegationVerdict || '').trim();
        const lvl = maturityNumber(s);
        // Only delegation candidates can be "not ready to hand over" — a HUMAN-ONLY step
        // is a fixed handoff point, so its maturity is not blocking anything. Marking it
        // would also make the mark disagree with the count in the sentence below.
        const immature = v && v !== 'HUMAN-ONLY' && lvl !== null && lvl < MATURITY_READY;
        const label = (s.name || s.stepId || 'Unnamed step') + (v ? ' — ' + v : ' — unrated');
        return (
          '<span class="shape-seg' + (immature ? ' immature' : '') + '"' +
          ' data-verdict="' + v + '" title="' + label.replace(/"/g, '&quot;') + '"></span>'
        );
      })
      .join('');

    const rated = steps.filter((s) => (s.delegationVerdict || '').trim());
    const candidates = rated.filter((s) => s.delegationVerdict !== 'HUMAN-ONLY');
    const blocked = candidates.filter((s) => {
      const l = maturityNumber(s);
      return l !== null && l < MATURITY_READY;
    });
    const unrated = steps.length - rated.length;

    const parts = [
      '<b>' + steps.length + '</b> steps',
      '<b>' + candidates.length + '</b> can be delegated (AGENT or ASSISTED)',
    ];
    if (blocked.length) {
      parts.push('<b>' + blocked.length + '</b> of those sit below L' + MATURITY_READY + ' and are not ready to hand over yet');
    }
    if (unrated) {
      parts.push('<b>' + unrated + '</b> still unrated');
    }
    els.shapeRead.innerHTML = parts.join(' · ') + '.';
  }

  function updateStepSummary(card, step) {
    card.querySelector('.step-name-preview').textContent = step.name || 'Untitled step';

    const verdictBadge = card.querySelector('.badge-verdict');
    if (step.delegationVerdict) {
      verdictBadge.textContent = step.delegationVerdict;
      verdictBadge.className = 'badge badge-verdict badge-verdict-' + verdictSlug(step.delegationVerdict);
      verdictBadge.hidden = false;
    } else {
      verdictBadge.hidden = true;
    }

    const maturityBadge = card.querySelector('.badge-maturity');
    if (step.maturityLevel) {
      maturityBadge.textContent = step.maturityLevel;
      maturityBadge.hidden = false;
    } else {
      maturityBadge.hidden = true;
    }
  }

  function buildExportObject() {
    return {
      playbook: { ...state.playbook },
      steps: state.steps.map((s) => ({
        id: s.stepId,
        name: s.name,
        trigger: s.trigger,
        inputs: s.inputs,
        sequence: s.sequence,
        decisionRules: s.decisionRules,
        standardOfDone: s.standardOfDone,
        vetoes: s.vetoes,
        failureModes: s.failureModes,
        artifacts: s.artifacts,
        dependencies: s.dependencies,
        tacitLayer: s.tacitLayer,
        maturity: { level: s.maturityLevel, nextAction: s.maturityNextAction },
        delegationVerdict: { verdict: s.delegationVerdict, reason: s.delegationReason },
        evalQuestion: s.evalQuestion,
        metadata: s.metadata,
      })),
      meta: { schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString() },
    };
  }

  // Signature of the meaningful content, used to tell "changed since last export" from
  // "unchanged". Version and timestamps are excluded so that bumping the version on export
  // does not itself count as a change.
  function contentSignature() {
    const { playbookId, version, capturedAt, ...rest } = state.playbook;
    return JSON.stringify({ playbook: rest, steps: state.steps });
  }

  function isDirty() {
    const sig = state.local && state.local.lastExportSignature;
    if (sig === null || sig === undefined) return hasContent();
    return sig !== contentSignature();
  }

  function hasContent() {
    const p = state.playbook;
    return Boolean(p.title || p.objective || p.owner || p.capturedBy || state.steps.length);
  }

  function updateExportState() {
    if (!els.exportState) return;
    if (!hasContent()) {
      els.exportState.textContent = '';
      els.exportState.className = 'export-state';
      return;
    }
    if (isDirty()) {
      const never = !(state.local && state.local.lastExportSignature);
      els.exportState.textContent = never ? '● NOT EXPORTED' : '● UNSAVED CHANGES';
      els.exportState.className = 'export-state is-dirty';
      els.exportState.title =
        'Your work is autosaved in this browser only. Clearing site data or moving to another ' +
        'machine loses it — Export JSON to get a durable file.';
    } else {
      const v = Number(state.playbook.version) || 0;
      // v === 0 means this content came in via Import and has never been exported from here.
      els.exportState.textContent = v ? '✓ EXPORTED v' + v : '✓ MATCHES FILE';
      els.exportState.className = 'export-state is-clean';
      els.exportState.title = v
        ? 'The current content matches the last file you exported.'
        : 'The current content still matches the file you imported.';
    }
  }

  function updatePreview() {
    if (!els.jsonPreview.hidden) {
      els.jsonPreview.textContent = JSON.stringify(buildExportObject(), null, 2);
    }
    updateExportState();
  }

  // ---- State mutation ----
  function addStep() {
    const step = makeEmptyStep();
    state.steps.push(step);
    expandedStepIds.add(step.id);
    persist();
    renderSteps();
    updatePreview();
    rebuildFlowChart();
  }

  function removeStep(id) {
    state.steps = state.steps.filter((s) => s.id !== id);
    expandedStepIds.delete(id);
    if (state.flowLayout) delete state.flowLayout[id];
    persist();
    renderSteps();
    updatePreview();
    rebuildFlowChart();
  }

  function moveStep(id, dir) {
    const idx = state.steps.findIndex((s) => s.id === id);
    const newIdx = idx + dir;
    if (idx === -1 || newIdx < 0 || newIdx >= state.steps.length) return;
    const [item] = state.steps.splice(idx, 1);
    state.steps.splice(newIdx, 0, item);
    persist();
    renderSteps();
    updatePreview();
    rebuildFlowChart();
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return hydrateState(parsed);
    } catch (e) {
      return null;
    }
  }

  // Reloads our own previously-persisted state (internal ids and flowLayout are trusted as-is).
  function hydrateState(parsed) {
    const base = makeEmptyState();
    if (!parsed || typeof parsed !== 'object') return base;
    const playbook = { ...base.playbook, ...(parsed.playbook || {}) };
    const steps = Array.isArray(parsed.steps)
      ? parsed.steps.map((s) => ({
          id: s.id || uid(),
          stepId: s.stepId || '',
          name: s.name || '',
          trigger: s.trigger || '',
          inputs: Array.isArray(s.inputs) ? s.inputs : [],
          sequence: Array.isArray(s.sequence) ? s.sequence : [],
          decisionRules: Array.isArray(s.decisionRules) ? s.decisionRules : [],
          standardOfDone: s.standardOfDone || '',
          vetoes: Array.isArray(s.vetoes) ? s.vetoes : [],
          failureModes: Array.isArray(s.failureModes) ? s.failureModes : [],
          artifacts: Array.isArray(s.artifacts) ? s.artifacts : [],
          dependencies: Array.isArray(s.dependencies) ? s.dependencies : [],
          tacitLayer: s.tacitLayer || '',
          maturityLevel: s.maturityLevel || '',
          maturityNextAction: s.maturityNextAction || '',
          delegationVerdict: s.delegationVerdict || '',
          delegationReason: s.delegationReason || '',
          evalQuestion: s.evalQuestion || '',
          metadata: s.metadata && typeof s.metadata === 'object' && !Array.isArray(s.metadata) ? s.metadata : {},
        }))
      : [];
    const flowLayout = parsed.flowLayout && typeof parsed.flowLayout === 'object' ? parsed.flowLayout : {};
    return { playbook, steps, flowLayout };
  }

  // Normalizes a user-provided exported playbook JSON file (Import JSON button).
  // The exported shape has no internal ids and nests maturity/delegationVerdict, so this
  // always mints fresh internal ids and resets flowLayout (no positions in the export).
  function normalizeImportedFile(parsed) {
    const base = makeEmptyState();
    // Spreading the incoming playbook last preserves an existing playbookId/version/capturedAt,
    // so re-importing an exported file continues that playbook's lineage rather than forking it.
    // Files from before this field existed fall back to the freshly-minted id in `base`.
    const playbook = { ...base.playbook, ...(parsed && parsed.playbook ? parsed.playbook : {}) };
    playbook.version = Number(playbook.version) || 0;
    const rawSteps = parsed && Array.isArray(parsed.steps) ? parsed.steps : [];
    const asArray = (v) => (Array.isArray(v) ? v : linesToArray(v));
    const steps = rawSteps.map((s) => {
      const maturity = s.maturity || {};
      const delegation = s.delegationVerdict;
      const delegationVerdict = typeof delegation === 'object' && delegation !== null ? delegation.verdict : delegation;
      const delegationReason = typeof delegation === 'object' && delegation !== null ? delegation.reason : s.delegationReason;
      const metadata = s.metadata && typeof s.metadata === 'object' && !Array.isArray(s.metadata) ? s.metadata : {};
      return {
        id: uid(),
        stepId: s.id || s.stepId || '',
        name: s.name || '',
        trigger: s.trigger || '',
        inputs: asArray(s.inputs),
        sequence: asArray(s.sequence),
        decisionRules: asArray(s.decisionRules),
        standardOfDone: s.standardOfDone || '',
        vetoes: asArray(s.vetoes),
        failureModes: asArray(s.failureModes),
        artifacts: asArray(s.artifacts),
        dependencies: asArray(s.dependencies),
        tacitLayer: s.tacitLayer || '',
        maturityLevel: (typeof maturity === 'object' ? maturity.level : maturity) || s.maturityLevel || '',
        maturityNextAction: (typeof maturity === 'object' ? maturity.nextAction : '') || s.maturityNextAction || '',
        delegationVerdict: delegationVerdict || '',
        delegationReason: delegationReason || '',
        evalQuestion: s.evalQuestion || '',
        metadata,
      };
    });
    const local = parsed && parsed.local ? parsed.local : base.local;
    return { playbook, steps, flowLayout: {}, local };
  }

  // ---- Status messages ----
  let statusTimeout;
  function setStatus(msg) {
    els.statusMsg.textContent = msg;
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => {
      els.statusMsg.textContent = '';
    }, 4000);
  }

  // ---- Event wiring: playbook meta ----
  els.title.addEventListener('input', () => {
    state.playbook.title = els.title.value;
    persist();
    updatePreview();
  });
  els.objective.addEventListener('input', () => {
    state.playbook.objective = els.objective.value;
    persist();
    updatePreview();
  });
  els.owner.addEventListener('input', () => {
    state.playbook.owner = els.owner.value;
    persist();
    updatePreview();
  });
  els.frequency.addEventListener('input', () => {
    state.playbook.frequency = els.frequency.value;
    persist();
    updatePreview();
  });
  els.capturedBy.addEventListener('input', () => {
    state.playbook.capturedBy = els.capturedBy.value;
    persist();
    updatePreview();
  });

  // ---- Event wiring: steps ----
  els.addStepBtn.addEventListener('click', addStep);

  const STEP_FIELD_MAP = {
    'step-id-field': (step, v) => (step.stepId = v),
    'step-name': (step, v) => (step.name = v),
    'step-trigger': (step, v) => (step.trigger = v),
    'step-inputs': (step, v) => (step.inputs = linesToArray(v)),
    'step-sequence': (step, v) => (step.sequence = linesToArray(v)),
    'step-decision-rules': (step, v) => (step.decisionRules = linesToArray(v)),
    'step-standard-of-done': (step, v) => (step.standardOfDone = v),
    'step-vetoes': (step, v) => (step.vetoes = linesToArray(v)),
    'step-failure-modes': (step, v) => (step.failureModes = linesToArray(v)),
    'step-artifacts': (step, v) => (step.artifacts = linesToArray(v)),
    'step-dependencies': (step, v) => (step.dependencies = linesToArray(v)),
    'step-tacit-layer': (step, v) => (step.tacitLayer = v),
    'step-maturity-level': (step, v) => (step.maturityLevel = v),
    'step-maturity-next-action': (step, v) => (step.maturityNextAction = v),
    'step-delegation-verdict': (step, v) => (step.delegationVerdict = v),
    'step-delegation-reason': (step, v) => (step.delegationReason = v),
    'step-eval-question': (step, v) => (step.evalQuestion = v),
    'step-metadata': (step, v) => (step.metadata = linesToKeyValueObject(v)),
  };

  const FLOW_SYNC_FIELDS = ['step-name', 'step-delegation-verdict', 'step-maturity-level'];

  function handleStepFieldChange(e) {
    const card = e.target.closest('.step-card');
    if (!card) return;
    const step = state.steps.find((s) => s.id === card.dataset.id);
    if (!step) return;

    let matchedField = null;
    for (const cls in STEP_FIELD_MAP) {
      if (e.target.classList.contains(cls)) {
        STEP_FIELD_MAP[cls](step, e.target.value);
        matchedField = cls;
        break;
      }
    }
    // Verdict and maturity are shown as state in the header and in the shape figure,
    // so both have to follow the field immediately rather than on the next full render.
    renderShape();
    persist();
    updatePreview();
    if (matchedField) {
      updateStepSummary(card, step);
      if (FLOW_SYNC_FIELDS.includes(matchedField)) updateFlowNodeContent(step);
    }
  }

  els.stepsContainer.addEventListener('input', handleStepFieldChange);
  els.stepsContainer.addEventListener('change', (e) => {
    if (e.target.tagName === 'SELECT') handleStepFieldChange(e);
  });

  els.stepsContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.step-card');
    if (!card) return;
    const id = card.dataset.id;

    if (e.target.classList.contains('delete-step-btn')) {
      if (confirm('Delete this step? This cannot be undone.')) removeStep(id);
    } else if (e.target.classList.contains('move-up-btn')) {
      moveStep(id, -1);
    } else if (e.target.classList.contains('move-down-btn')) {
      moveStep(id, 1);
    } else if (e.target.closest('.step-summary-toggle')) {
      const toggleBtn = e.target.closest('.step-summary-toggle');
      const body = card.querySelector('.step-body');
      const willExpand = body.hidden;
      body.hidden = !willExpand;
      toggleBtn.setAttribute('aria-expanded', String(willExpand));
      toggleBtn.querySelector('.chevron').textContent = willExpand ? '▾' : '▸';
      if (willExpand) expandedStepIds.add(id);
      else expandedStepIds.delete(id);
    }
  });

  els.expandAllBtn.addEventListener('click', () => {
    state.steps.forEach((s) => expandedStepIds.add(s.id));
    renderSteps();
  });

  els.collapseAllBtn.addEventListener('click', () => {
    expandedStepIds.clear();
    renderSteps();
  });

  // ---- New / Import / Export ----
  els.newPlaybookBtn.addEventListener('click', () => {
    if (!confirm('Start a new playbook? This clears the current form. Export first if you want to keep it.')) return;
    state = makeEmptyState();
    expandedStepIds.clear();
    persist();
    renderAll();
    rebuildFlowChart();
    setStatus('Started a new playbook');
  });

  els.importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        state = normalizeImportedFile(parsed);
        expandedStepIds.clear();
        // The content just came from a file on disk, so a durable copy demonstrably exists.
        state.local.lastExportSignature = contentSignature();
        persist();
        renderAll();
        rebuildFlowChart();
        setStatus('Imported ' + file.name);
      } catch (err) {
        alert('Could not parse that file as JSON: ' + err.message);
      }
    };
    reader.onerror = () => alert('Could not read that file.');
    reader.readAsText(file);
    e.target.value = '';
  });

  els.exportBtn.addEventListener('click', () => {
    // Bump before building so the exported file carries the version it is.
    state.playbook.version = (Number(state.playbook.version) || 0) + 1;
    const data = buildExportObject();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle =
      (state.playbook.title || 'playbook')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'playbook';
    a.href = url;
    a.download = `${safeTitle}.v${state.playbook.version}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    state.local.lastExportSignature = contentSignature();
    persist();
    updateExportState();
    setStatus('Exported ' + a.download);
    lastExportName = a.download;
    if (els.atlasHint) {
      els.atlasCmd.textContent =
        'node tools/to-atlas.mjs "' + a.download + '" > records.json && iris datasets import records.json -s xart-playbook';
      els.atlasHint.hidden = false;
    }
  });

  // ---- Send to Atlas ----
  // The app stays local-only on purpose: nothing is saved anywhere and the export is
  // the only artifact. So this deliberately does NOT post from the browser — that would
  // mean shipping a write credential to a static page. It hands you the two commands
  // that push the file you just exported, and copies them.
  let lastExportName = '';
  if (els.copyAtlasCmdBtn) {
    els.copyAtlasCmdBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(els.atlasCmd.textContent || '');
        setStatus('Copied — run it where the file downloaded');
      } catch {
        setStatus('Select the command above and copy it');
      }
    });
  }

  // ---- JSON preview toggle ----
  els.togglePreviewBtn.addEventListener('click', () => {
    const willShow = els.jsonPreview.hidden;
    els.jsonPreview.hidden = !willShow;
    els.togglePreviewBtn.setAttribute('aria-expanded', String(willShow));
    els.togglePreviewBtn.textContent = willShow ? 'Hide JSON Preview' : 'Show JSON Preview';
    if (willShow) updatePreview();
  });

  // ---- Copy Claude-ready prompt ----
  function buildClaudePrompt(data) {
    return [
      'You are helping design an automation plan for the following manually-run process.',
      'Each step below documents its trigger, inputs, real sequence, decision rules (with actual',
      'thresholds), standard of done, vetoes, failure modes, artifacts, dependencies, tacit judgment,',
      'a maturity level (L0-L4), a delegation verdict (AGENT / ASSISTED / HUMAN-ONLY) with reason,',
      'and an eval question for checking correct execution.',
      '',
      'Use this playbook as context to:',
      '1. Respect each step’s DELEGATION VERDICT — only propose automating AGENT and ASSISTED steps;',
      '   treat HUMAN-ONLY steps as fixed handoff points, not automation targets.',
      '2. For each AGENT/ASSISTED step, turn its DECISION RULES, STANDARD OF DONE, and VETOES into',
      '   explicit logic or guardrails, and its EVAL QUESTION into a concrete test.',
      '3. Propose an overall automation architecture (scripts, agent, integrations, triggers) that',
      '   honors ARTIFACTS naming/versioning and DEPENDENCIES between steps.',
      '4. Draft an implementation plan, or a Claude agent/tool definition, that could carry out',
      '   the automatable steps, noting what MATURITY next action is required first for any step',
      '   not yet ready.',
      '',
      'Playbook JSON:',
      '',
      '```json',
      JSON.stringify(data, null, 2),
      '```',
    ].join('\n');
  }

  els.copyPromptBtn.addEventListener('click', async () => {
    const prompt = buildClaudePrompt(buildExportObject());
    try {
      await navigator.clipboard.writeText(prompt);
      setStatus('Prompt copied to clipboard');
    } catch (err) {
      console.log(prompt);
      alert('Could not copy automatically — the prompt was logged to the browser console instead.');
    }
  });

  // ---- Theme ----
  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /* An embedded copy has a host with its own theme, and no way to reach this origin's
     localStorage to say so. `?theme=light|dark` lets the embedder state it in the URL.
     It is a one-shot override for this load only — it deliberately does NOT write to
     localStorage, so someone who opens the tool directly afterwards still gets the theme
     they chose here. Precedence: URL, then their stored choice, then the OS. */
  function getUrlParam(name) {
    try {
      return new URLSearchParams(window.location.search).get(name);
    } catch (e) {
      return null;
    }
  }

  function getUrlTheme() {
    const t = (getUrlParam('theme') || '').toLowerCase();
    return t === 'light' || t === 'dark' ? t : null;
  }

  function resolveTheme() {
    return getUrlTheme() || getStoredTheme() || (systemPrefersDark() ? 'dark' : 'light');
  }

  /* `?accent=RRGGBB` retints the one accent the design uses, so an embed can carry its
     host's brand without forking the stylesheet. Hex only, validated — an unchecked value
     here would be a CSS injection point, and the accent is the only token worth exposing:
     the semantic colours mean fixed things and must not be themeable. */
  function applyUrlAccent() {
    const raw = (getUrlParam('accent') || '').replace(/^#/, '');
    if (!/^[0-9a-fA-F]{6}$/.test(raw)) return;
    document.documentElement.style.setProperty('--accent', '#' + raw);
    document.documentElement.style.setProperty('--accent-hover', '#' + raw);
  }

  function applyTheme() {
    const theme = resolveTheme();
    document.documentElement.setAttribute('data-theme', theme);
    applyUrlAccent();
    els.themeToggleBtn.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
    els.themeToggleBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  els.themeToggleBtn.addEventListener('click', () => {
    const next = resolveTheme() === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {}
    applyTheme();
  });

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!getStoredTheme()) applyTheme();
    });
  }

  applyTheme();

  // ---- Process Flow (Drawflow) ----
  let flowEditor = null;
  let flowInitialized = false;
  let flowNodeIdByStepId = new Map();

  function initFlowEditor() {
    if (flowInitialized || typeof Drawflow === 'undefined') return;
    flowEditor = new Drawflow(els.flowCanvas);
    flowEditor.curvature = 0.4;
    flowEditor.reroute = true;
    flowEditor.start();
    flowEditor.on('nodeMoved', (id) => {
      const node = flowEditor.getNodeFromId(id);
      if (!node) return;
      let stepId = null;
      for (const [sId, nId] of flowNodeIdByStepId.entries()) {
        if (String(nId) === String(id)) {
          stepId = sId;
          break;
        }
      }
      if (!stepId) return;
      state.flowLayout = state.flowLayout || {};
      state.flowLayout[stepId] = { x: node.pos_x, y: node.pos_y };
      persist();
    });
    flowInitialized = true;
  }

  function buildFlowNodeHtml(step, index) {
    const name = escapeHtml(step.name) || 'Untitled step';
    const verdictHtml = step.delegationVerdict
      ? `<span class="badge badge-verdict-${verdictSlug(step.delegationVerdict)}">${escapeHtml(step.delegationVerdict)}</span>`
      : '';
    const maturityHtml = step.maturityLevel ? `<span class="badge">${escapeHtml(step.maturityLevel)}</span>` : '';
    return (
      '<div class="flow-node-content">' +
      `<div class="flow-node-index">Step ${index}</div>` +
      `<div class="flow-node-name">${name}</div>` +
      `<div class="flow-node-badges">${verdictHtml}${maturityHtml}</div>` +
      '</div>'
    );
  }

  function updateFlowNodeContent(step) {
    const nodeId = flowNodeIdByStepId.get(step.id);
    if (nodeId == null) return;
    const wrapper = document.getElementById('node-' + nodeId);
    if (!wrapper) return;
    const content = wrapper.querySelector('.drawflow_content_node');
    if (!content) return;
    const index = state.steps.findIndex((s) => s.id === step.id) + 1;
    content.innerHTML = buildFlowNodeHtml(step, index);
  }

  function rebuildFlowChart() {
    if (typeof Drawflow === 'undefined') return;
    initFlowEditor();
    if (!flowEditor) return;

    const hasSteps = state.steps.length > 0;
    els.flowEmptyState.hidden = hasSteps;
    els.flowCanvas.style.display = hasSteps ? '' : 'none';

    flowEditor.clear();
    flowNodeIdByStepId = new Map();
    if (!hasSteps) return;

    state.flowLayout = state.flowLayout || {};

    state.steps.forEach((step, index) => {
      const saved = state.flowLayout[step.id];
      const x = saved ? saved.x : 60 + index * 260;
      const y = saved ? saved.y : 80;
      const nodeId = flowEditor.addNode('step', 1, 1, x, y, 'flow-node', { stepId: step.id }, buildFlowNodeHtml(step, index + 1), false);
      flowNodeIdByStepId.set(step.id, nodeId);
    });

    state.steps.forEach((step, index) => {
      if (index === 0) return;
      const fromId = flowNodeIdByStepId.get(state.steps[index - 1].id);
      const toId = flowNodeIdByStepId.get(step.id);
      if (fromId != null && toId != null) flowEditor.addConnection(fromId, toId, 'output_1', 'input_1');
    });
  }

  els.flowRefreshBtn.addEventListener('click', () => {
    rebuildFlowChart();
    setStatus('Flow diagram refreshed');
  });

  els.flowZoomInBtn.addEventListener('click', () => {
    if (flowEditor) flowEditor.zoom_in();
  });

  els.flowZoomOutBtn.addEventListener('click', () => {
    if (flowEditor) flowEditor.zoom_out();
  });

  els.flowResetViewBtn.addEventListener('click', () => {
    if (flowEditor) flowEditor.zoom_reset();
  });

  els.flowExportPngBtn.addEventListener('click', async () => {
    if (typeof html2canvas === 'undefined') {
      alert('The image export library failed to load. Check your internet connection and try again.');
      return;
    }
    if (state.steps.length === 0) {
      alert('Add at least one step before exporting the flow chart.');
      return;
    }
    try {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#ffffff';
      const canvas = await html2canvas(els.flowCanvas, { backgroundColor: bg });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeTitle =
          (state.playbook.title || 'process-flow')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') || 'process-flow';
        a.href = url;
        a.download = `${safeTitle}-flow.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setStatus('Exported ' + a.download);
      }, 'image/png');
    } catch (err) {
      alert('Could not export the flow chart as an image: ' + err.message);
    }
  });

  // ---- Init ----
  renderAll();
  rebuildFlowChart();
})();
