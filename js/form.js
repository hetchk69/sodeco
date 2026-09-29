// form.js
// Carga las preguntas del rol actual, agrupadas por sección, con autoguardado
// en `answers` y envío final que bloquea la edición.

const FormScreen = (() => {
  let profile = null;
  let submission = null;
  let questions = [];
  let answersByQuestion = {};
  let saveTimers = {};

  async function load(currentProfile) {
    profile = currentProfile;

    const { data: sub, error: subErr } = await window.db.rpc('ensure_submission', {
      p_user_id: profile.id,
    });
    if (subErr) throw subErr;

    const { data: subRow, error: subRowErr } = await window.db
      .from('submissions')
      .select('id, status, submitted_at')
      .eq('id', sub)
      .single();
    if (subRowErr) throw subRowErr;
    submission = subRow;

    const { data: qs, error: qErr } = await window.db
      .from('questions')
      .select('id, code, section, text, purpose, answer_type, choices, position')
      .order('position', { ascending: true });
    if (qErr) throw qErr;
    questions = qs;

    const { data: ans, error: aErr } = await window.db
      .from('answers')
      .select('question_id, value_text, value_number')
      .eq('submission_id', submission.id);
    if (aErr) throw aErr;

    answersByQuestion = {};
    for (const a of ans) answersByQuestion[a.question_id] = a;

    if (submission.status === 'submitted') {
      renderConfirmation();
      return 'confirm';
    }

    render();
    return 'form';
  }

  function isAnswered(q) {
    const a = answersByQuestion[q.id];
    if (!a) return false;
    if (q.answer_type === 'number') return a.value_number !== null && a.value_number !== undefined;
    return !!(a.value_text && a.value_text.trim().length > 0);
  }

  function progressText() {
    const answered = questions.filter(isAnswered).length;
    return `${answered} de ${questions.length} respondidas`;
  }

  function updateProgressUI() {
    const answered = questions.filter(isAnswered).length;
    const pct = questions.length ? Math.round((answered / questions.length) * 100) : 0;
    document.getElementById('form-progress').textContent = progressText();
    document.getElementById('form-progress-bar').style.width = `${pct}%`;
  }

  function render() {
    const container = document.getElementById('form-questions');
    container.textContent = '';

    const bySection = {};
    for (const q of questions) {
      if (!bySection[q.section]) bySection[q.section] = [];
      bySection[q.section].push(q);
    }

    for (const section of Object.keys(bySection)) {
      const h = document.createElement('h3');
      h.className = 'form-section-title';
      h.textContent = section;
      container.appendChild(h);

      for (const q of bySection[section]) {
        container.appendChild(renderQuestion(q));
      }
    }

    updateProgressUI();
  }

  function renderQuestion(q) {
    const wrap = document.createElement('div');
    wrap.className = 'question';

    const label = document.createElement('label');
    label.className = 'question-text';
    label.textContent = q.text;
    label.setAttribute('for', `q_${q.id}`);
    wrap.appendChild(label);

    if (q.purpose) {
      const help = document.createElement('div');
      help.className = 'question-purpose';
      help.textContent = q.purpose;
      wrap.appendChild(help);
    }

    const existing = answersByQuestion[q.id];
    let input;

    if (q.answer_type === 'number') {
      input = document.createElement('input');
      input.type = 'number';
      input.inputMode = 'decimal';
      if (existing && existing.value_number !== null) input.value = existing.value_number;
    } else if (q.answer_type === 'choice' && Array.isArray(q.choices) && q.choices.length) {
      input = document.createElement('select');
      const blank = document.createElement('option');
      blank.value = '';
      blank.textContent = 'Selecciona...';
      input.appendChild(blank);
      for (const choice of q.choices) {
        const opt = document.createElement('option');
        opt.value = choice;
        opt.textContent = choice;
        if (existing && existing.value_text === choice) opt.selected = true;
        input.appendChild(opt);
      }
    } else {
      input = document.createElement('textarea');
      input.rows = 2;
      if (existing && existing.value_text) input.value = existing.value_text;
    }

    input.id = `q_${q.id}`;
    input.className = 'question-input';
    input.addEventListener('blur', () => scheduleSave(q, input));
    input.addEventListener('change', () => scheduleSave(q, input));

    wrap.appendChild(input);
    return wrap;
  }

  function scheduleSave(q, input) {
    clearTimeout(saveTimers[q.id]);
    saveTimers[q.id] = setTimeout(() => saveAnswer(q, input), 300);
  }

  async function saveAnswer(q, input) {
    const status = document.getElementById('form-status');
    const payload = {
      submission_id: submission.id,
      question_id: q.id,
      value_text: q.answer_type === 'number' ? null : input.value || null,
      value_number: q.answer_type === 'number' ? (input.value === '' ? null : Number(input.value)) : null,
    };

    const { error } = await window.db
      .from('answers')
      .upsert(payload, { onConflict: 'submission_id,question_id' });

    if (error) {
      status.textContent = 'No se pudo guardar. Revisa tu conexión.';
      return;
    }

    answersByQuestion[q.id] = { question_id: q.id, value_text: payload.value_text, value_number: payload.value_number };
    status.textContent = 'Guardado';
    updateProgressUI();
    setTimeout(() => {
      if (status.textContent === 'Guardado') status.textContent = '';
    }, 1500);
  }

  async function submit() {
    const missing = questions.filter((q) => !isAnswered(q));
    const errorEl = document.getElementById('form-error');

    if (missing.length > 0) {
      errorEl.textContent = `Faltan ${missing.length} preguntas por responder.`;
      return false;
    }
    errorEl.textContent = '';

    const { error } = await window.db
      .from('submissions')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', submission.id);

    if (error) {
      errorEl.textContent = 'No se pudo enviar. Intenta de nuevo.';
      return false;
    }

    submission.status = 'submitted';
    renderConfirmation();
    return true;
  }

  function renderConfirmation() {
    Router.showScreen('confirm');
  }

  return { load, submit };
})();

window.FormScreen = FormScreen;
