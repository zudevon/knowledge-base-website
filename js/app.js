(() => {
  const STORAGE_KEY = 'playbookBuilder.state.v1';
  const SCHEMA_VERSION = 1;

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
      name: '',
      description: '',
      inputs: [],
      outputs: [],
      tools: [],
      owner: '',
      effort: '',
      notes: '',
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
      node.querySelector('.step-name').value = step.name || '';
      node.querySelector('.step-description').value = step.description || '';
      node.querySelector('.step-inputs').value = arrayToLines(step.inputs);
      node.querySelector('.step-outputs').value = arrayToLines(step.outputs);
      node.querySelector('.step-tools').value = arrayToLines(step.tools);
      node.querySelector('.step-owner').value = step.owner || '';
      node.querySelector('.step-effort').value = step.effort || '';
      node.querySelector('.step-notes').value = step.notes || '';

      node.querySelector('.move-up-btn').disabled = index === 0;
      node.querySelector('.move-down-btn').disabled = index === state.steps.length - 1;

      els.stepsContainer.appendChild(node);
    });
  }

  function buildExportObject() {
    return {
      playbook: { ...state.playbook },
      steps: state.steps.map((s) => ({ ...s })),
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
    const steps = rawSteps.map((s) => ({
      id: s.id || uid(),
      name: s.name || '',
      description: s.description || '',
      inputs: Array.isArray(s.inputs) ? s.inputs : linesToArray(s.inputs),
      outputs: Array.isArray(s.outputs) ? s.outputs : linesToArray(s.outputs),
      tools: Array.isArray(s.tools) ? s.tools : linesToArray(s.tools),
      owner: s.owner || '',
      effort: s.effort || '',
      notes: s.notes || '',
    }));
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

  els.stepsContainer.addEventListener('input', (e) => {
    const card = e.target.closest('.step-card');
    if (!card) return;
    const step = state.steps.find((s) => s.id === card.dataset.id);
    if (!step) return;

    const fieldMap = {
      'step-name': (v) => (step.name = v),
      'step-description': (v) => (step.description = v),
      'step-inputs': (v) => (step.inputs = linesToArray(v)),
      'step-outputs': (v) => (step.outputs = linesToArray(v)),
      'step-tools': (v) => (step.tools = linesToArray(v)),
      'step-owner': (v) => (step.owner = v),
      'step-effort': (v) => (step.effort = v),
      'step-notes': (v) => (step.notes = v),
    };

    for (const cls in fieldMap) {
      if (e.target.classList.contains(cls)) {
        fieldMap[cls](e.target.value);
        break;
      }
    }
    persist();
    updatePreview();
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
      'The process has been documented as a step-by-step playbook, including the inputs, outputs,',
      'tools, owners, and effort involved at each step.',
      '',
      'Use this playbook as context to:',
      '1. Identify which steps are good candidates for automation and why.',
      '2. Propose an overall automation architecture (scripts, agent, integrations, triggers).',
      '3. Draft an implementation plan, or a Claude agent/tool definition, that could carry out',
      '   the automatable steps.',
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

  // ---- Init ----
  renderAll();
})();
