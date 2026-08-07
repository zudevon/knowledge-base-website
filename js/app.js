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
    newPlaybookBtn: document.getElementById('newPlaybookBtn'),
    importInput: document.getElementById('importInput'),
    exportBtn: document.getElementById('exportBtn'),
    copyPromptBtn: document.getElementById('copyPromptBtn'),
    togglePreviewBtn: document.getElementById('togglePreviewBtn'),
    jsonPreview: document.getElementById('jsonPreview'),
    statusMsg: document.getElementById('statusMsg'),
    stepTemplate: document.getElementById('stepTemplate'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
  };

  let state = loadState() || makeEmptyState();

  function makeEmptyState() {
    return {
      playbook: { title: '', objective: '', owner: '', frequency: '' },
      steps: [],
    };
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

  // ---- Rendering ----
  function renderAll() {
    els.title.value = state.playbook.title || '';
    els.objective.value = state.playbook.objective || '';
    els.owner.value = state.playbook.owner || '';
    els.frequency.value = state.playbook.frequency || '';
    renderSteps();
    updatePreview();
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

      node.querySelector('.move-up-btn').disabled = index === 0;
      node.querySelector('.move-down-btn').disabled = index === state.steps.length - 1;

      els.stepsContainer.appendChild(node);
    });
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
      })),
      meta: { schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString() },
    };
  }

  function updatePreview() {
    if (!els.jsonPreview.hidden) {
      els.jsonPreview.textContent = JSON.stringify(buildExportObject(), null, 2);
    }
  }

  // ---- State mutation ----
  function addStep() {
    state.steps.push(makeEmptyStep());
    persist();
    renderSteps();
    updatePreview();
  }

  function removeStep(id) {
    state.steps = state.steps.filter((s) => s.id !== id);
    persist();
    renderSteps();
    updatePreview();
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
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return normalizeImported(parsed);
    } catch (e) {
      return null;
    }
  }

  function normalizeImported(parsed) {
    const base = makeEmptyState();
    const playbook = { ...base.playbook, ...(parsed && parsed.playbook ? parsed.playbook : {}) };
    const rawSteps = parsed && Array.isArray(parsed.steps) ? parsed.steps : [];
    const steps = rawSteps.map((s) => {
      const asArray = (v) => (Array.isArray(v) ? v : linesToArray(v));
      const maturity = s.maturity || {};
      const delegation = s.delegationVerdict;
      const delegationVerdict = typeof delegation === 'object' && delegation !== null ? delegation.verdict : delegation;
      const delegationReason = typeof delegation === 'object' && delegation !== null ? delegation.reason : s.delegationReason;
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
      };
    });
    return { playbook, steps };
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
  };

  function handleStepFieldChange(e) {
    const card = e.target.closest('.step-card');
    if (!card) return;
    const step = state.steps.find((s) => s.id === card.dataset.id);
    if (!step) return;

    for (const cls in STEP_FIELD_MAP) {
      if (e.target.classList.contains(cls)) {
        STEP_FIELD_MAP[cls](step, e.target.value);
        break;
      }
    }
    persist();
    updatePreview();
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
    }
  });

  // ---- New / Import / Export ----
  els.newPlaybookBtn.addEventListener('click', () => {
    if (!confirm('Start a new playbook? This clears the current form. Export first if you want to keep it.')) return;
    state = makeEmptyState();
    persist();
    renderAll();
    setStatus('Started a new playbook');
  });

  els.importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        state = normalizeImported(parsed);
        persist();
        renderAll();
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
    a.download = `${safeTitle}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus('Exported ' + a.download);
  });

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

  function currentTheme() {
    return getStoredTheme() || (systemPrefersDark() ? 'dark' : 'light');
  }

  function updateThemeButton() {
    const isDark = currentTheme() === 'dark';
    els.themeToggleBtn.textContent = isDark ? '☀️ Light' : '🌙 Dark';
    els.themeToggleBtn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  }

  els.themeToggleBtn.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {}
    document.documentElement.setAttribute('data-theme', next);
    updateThemeButton();
  });

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!getStoredTheme()) updateThemeButton();
    });
  }

  updateThemeButton();

  // ---- Init ----
  renderAll();
})();
