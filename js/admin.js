// admin.js
// Solo se llama cuando el profile.role es 'admin'. Lista de usuarios y avance,
// filtro por rol/ubicación, detalle de respuestas, alta de usuarios, reabrir
// formulario y exportación a CSV.

const AdminScreen = (() => {
  let locations = [];
  let rows = []; // profiles + submission + location, ya combinados

  async function load() {
    const [{ data: locs, error: locErr }, { data: profs, error: profErr }] = await Promise.all([
      window.db.from('locations').select('id, name, type'),
      window.db.from('profiles').select('id, full_name, phone, role, location_id'),
    ]);
    if (locErr) throw locErr;
    if (profErr) throw profErr;
    locations = locs;

    const { data: subs, error: subErr } = await window.db
      .from('submissions')
      .select('id, user_id, status, submitted_at');
    if (subErr) throw subErr;

    const subByUser = {};
    for (const s of subs) subByUser[s.user_id] = s;

    rows = profs.map((p) => ({
      profile: p,
      location: locations.find((l) => l.id === p.location_id) || null,
      submission: subByUser[p.id] || null,
    }));

    populateLocationFilter();
    populateAddUserLocations();
    render();
  }

  function populateLocationFilter() {
    const sel = document.getElementById('admin-filter-location');
    sel.textContent = '';
    const any = document.createElement('option');
    any.value = '';
    any.textContent = 'Todas las ubicaciones';
    sel.appendChild(any);
    for (const l of locations) {
      const opt = document.createElement('option');
      opt.value = l.id;
      opt.textContent = l.name;
      sel.appendChild(opt);
    }
  }

  function populateAddUserLocations() {
    const sel = document.getElementById('admin-add-location');
    sel.textContent = '';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = 'Sin ubicación';
    sel.appendChild(none);
    for (const l of locations) {
      const opt = document.createElement('option');
      opt.value = l.id;
      opt.textContent = l.name;
      sel.appendChild(opt);
    }
  }

  function roleLabel(role) {
    return (
      {
        jefe_tienda: 'Jefe de Tienda',
        asesor_tienda: 'Asesor de Tienda',
        jefe_bodega: 'Jefe de Bodega',
        gerencia: 'Gerencia',
        admin: 'Administrador',
      }[role] || role
    );
  }

  function statusLabel(status) {
    return (
      {
        draft: 'En progreso',
        submitted: 'Enviado',
        sin_iniciar: 'Sin iniciar',
      }[status] || status
    );
  }

  function currentFilters() {
    return {
      role: document.getElementById('admin-filter-role').value,
      location: document.getElementById('admin-filter-location').value,
    };
  }

  function render() {
    const { role, location } = currentFilters();
    const tbody = document.getElementById('admin-table-body');
    tbody.textContent = '';

    const filtered = rows.filter((r) => {
      if (role && r.profile.role !== role) return false;
      if (location && r.profile.location_id !== location) return false;
      return true;
    });

    for (const r of filtered) {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      tdName.textContent = r.profile.full_name;
      tr.appendChild(tdName);

      const tdRole = document.createElement('td');
      const roleBadge = document.createElement('span');
      roleBadge.className = `badge badge-role-${r.profile.role}`;
      roleBadge.textContent = roleLabel(r.profile.role);
      tdRole.appendChild(roleBadge);
      tr.appendChild(tdRole);

      const tdLoc = document.createElement('td');
      tdLoc.textContent = r.location ? r.location.name : '—';
      tr.appendChild(tdLoc);

      const tdStatus = document.createElement('td');
      const statusValue = r.submission ? r.submission.status : 'sin_iniciar';
      const statusBadge = document.createElement('span');
      statusBadge.className = `badge badge-status-${statusValue}`;
      statusBadge.textContent = statusLabel(statusValue);
      tdStatus.appendChild(statusBadge);
      tr.appendChild(tdStatus);

      const tdActions = document.createElement('td');

      const viewBtn = document.createElement('button');
      viewBtn.textContent = 'Ver respuestas';
      viewBtn.className = 'btn-secondary';
      viewBtn.disabled = !r.submission;
      viewBtn.addEventListener('click', () => showDetail(r));
      tdActions.appendChild(viewBtn);

      if (r.submission && r.submission.status === 'submitted') {
        const reopenBtn = document.createElement('button');
        reopenBtn.textContent = 'Reabrir';
        reopenBtn.className = 'btn-secondary';
        reopenBtn.addEventListener('click', () => reopen(r));
        tdActions.appendChild(reopenBtn);
      }

      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    }
  }

  async function showDetail(row) {
    const panel = document.getElementById('admin-detail');
    panel.textContent = '';

    const title = document.createElement('h3');
    const locationName = row.location ? row.location.name : 'Sin ubicación';
    title.textContent = `${row.profile.full_name} — ${roleLabel(row.profile.role)} — ${locationName}`;
    panel.appendChild(title);

    const { data: answers, error } = await window.db
      .from('answers')
      .select('value_text, value_number, questions(text, section, position)')
      .eq('submission_id', row.submission.id)
      .order('question_id');
    if (error) {
      panel.appendChild(document.createTextNode('No se pudieron cargar las respuestas.'));
      return;
    }

    const sorted = answers.slice().sort((a, b) => (a.questions?.position || 0) - (b.questions?.position || 0));

    for (const a of sorted) {
      const item = document.createElement('div');
      item.className = 'question';

      const q = document.createElement('div');
      q.className = 'question-text';
      q.textContent = a.questions ? a.questions.text : '(pregunta eliminada)';
      item.appendChild(q);

      const v = document.createElement('div');
      v.className = 'question-purpose';
      v.textContent = a.value_text ?? a.value_number ?? '(sin respuesta)';
      item.appendChild(v);

      panel.appendChild(item);
    }
  }

  async function reopen(row) {
    const { error } = await window.db
      .from('submissions')
      .update({ status: 'draft', submitted_at: null })
      .eq('id', row.submission.id);
    if (error) {
      alert('No se pudo reabrir el formulario.');
      return;
    }
    await load();
  }

  async function addUser(formData) {
    const errorEl = document.getElementById('admin-add-error');
    errorEl.textContent = '';

    const phone = formData.phone.trim();
    if (!phone.startsWith('+')) {
      errorEl.textContent = 'El teléfono debe estar en formato internacional, ej. +573001234567.';
      return false;
    }

    const { error } = await window.db.from('allowed_users').insert({
      phone,
      full_name: formData.full_name,
      role: formData.role,
      location_id: formData.location_id || null,
    });

    if (error) {
      errorEl.textContent = 'No se pudo agregar: ' + error.message;
      return false;
    }

    await load();
    return true;
  }

  function toCsv() {
    const header = ['usuario', 'telefono', 'rol', 'ubicacion', 'seccion', 'pregunta', 'respuesta'];
    const lines = [header.join(',')];

    return window.db
      .from('answers')
      .select('value_text, value_number, submissions(user_id), questions(text, section)')
      .then(({ data, error }) => {
        if (error) throw error;

        const profileById = {};
        for (const r of rows) profileById[r.profile.id] = r;

        for (const a of data) {
          const userId = a.submissions?.user_id;
          const row = profileById[userId];
          if (!row) continue;

          const fields = [
            row.profile.full_name,
            row.profile.phone,
            row.profile.role,
            row.location ? row.location.name : '',
            a.questions ? a.questions.section : '',
            a.questions ? a.questions.text : '',
            a.value_text ?? a.value_number ?? '',
          ].map(csvEscape);

          lines.push(fields.join(','));
        }

        return lines.join('\n');
      });
  }

  function csvEscape(value) {
    const str = String(value ?? '');
    if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
    return str;
  }

  async function exportCsv() {
    const csv = await toCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `levantamiento_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return { load, render, addUser, exportCsv };
})();

window.AdminScreen = AdminScreen;
