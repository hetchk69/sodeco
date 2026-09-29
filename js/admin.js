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
      viewBtn.addEventListener('click', () => toggleDetail(r, tr, viewBtn));
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

  async function fetchAnswers(row) {
    const { data, error } = await window.db
      .from('answers')
      .select('value_text, value_number, questions(text, section, position)')
      .eq('submission_id', row.submission.id);
    if (error) throw error;
    return data
      .slice()
      .sort((a, b) => (a.questions?.position || 0) - (b.questions?.position || 0))
      .map((a) => ({
        seccion: a.questions ? a.questions.section : '',
        pregunta: a.questions ? a.questions.text : '(pregunta eliminada)',
        respuesta: a.value_text ?? a.value_number ?? '',
      }));
  }

  function summaryOf(row, answers) {
    return {
      usuario: row.profile.full_name,
      telefono: row.profile.phone,
      rol: row.profile.role,
      ubicacion: row.location ? row.location.name : null,
      estado: row.submission.status,
      enviado: row.submission.submitted_at,
      respuestas: answers,
    };
  }

  function fileBase(row) {
    const slug = row.profile.full_name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    return `respuestas_${slug}_${new Date().toISOString().slice(0, 10)}`;
  }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadJson(row, answers) {
    const json = JSON.stringify(summaryOf(row, answers), null, 2);
    saveBlob(new Blob([json], { type: 'application/json;charset=utf-8' }), `${fileBase(row)}.json`);
  }

  function downloadPdf(row, answers) {
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 48;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    const bottom = doc.internal.pageSize.getHeight() - margin;
    let y = margin;

    const write = (text, { size = 10, bold = false, gap = 4 } = {}) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      for (const line of doc.splitTextToSize(String(text), width)) {
        if (y > bottom) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += size * 1.3;
      }
      y += gap;
    };

    write('Levantamiento de Tiendas y Bodegas', { size: 15, bold: true, gap: 8 });
    write(row.profile.full_name, { size: 12, bold: true });
    write(`${roleLabel(row.profile.role)} — ${row.location ? row.location.name : 'Sin ubicación'}`);
    write(`Teléfono: ${row.profile.phone} · Estado: ${statusLabel(row.submission.status)}`, { gap: 12 });

    let section = null;
    for (const a of answers) {
      if (a.seccion !== section) {
        section = a.seccion;
        write(section || 'Sin sección', { size: 11, bold: true, gap: 4 });
      }
      write(a.pregunta, { bold: true, gap: 1 });
      write(a.respuesta === '' ? '(sin respuesta)' : a.respuesta, { gap: 8 });
    }
    doc.save(`${fileBase(row)}.pdf`);
  }

  async function toggleDetail(row, tr, btn) {
    const next = tr.nextElementSibling;
    if (next && next.classList.contains('detail-row')) {
      next.remove();
      btn.textContent = 'Ver respuestas';
      return;
    }

    btn.disabled = true;
    let answers;
    try {
      answers = await fetchAnswers(row);
    } catch (e) {
      alert('No se pudieron cargar las respuestas.');
      btn.disabled = false;
      return;
    }
    btn.disabled = false;
    btn.textContent = 'Ocultar respuestas';

    const detailTr = document.createElement('tr');
    detailTr.className = 'detail-row';
    const td = document.createElement('td');
    td.colSpan = 5;

    const bar = document.createElement('div');
    bar.className = 'detail-actions';
    const pdfBtn = document.createElement('button');
    pdfBtn.textContent = 'Descargar PDF';
    pdfBtn.className = 'btn-secondary';
    pdfBtn.addEventListener('click', () => downloadPdf(row, answers));
    const jsonBtn = document.createElement('button');
    jsonBtn.textContent = 'Descargar JSON';
    jsonBtn.className = 'btn-secondary';
    jsonBtn.addEventListener('click', () => downloadJson(row, answers));
    bar.append(pdfBtn, jsonBtn);
    td.appendChild(bar);

    if (!answers.length) {
      td.appendChild(document.createTextNode('Sin respuestas todavía.'));
    }
    for (const a of answers) {
      const item = document.createElement('div');
      item.className = 'question';
      const q = document.createElement('div');
      q.className = 'question-text';
      q.textContent = a.pregunta;
      const v = document.createElement('div');
      v.className = 'question-purpose';
      v.textContent = a.respuesta === '' ? '(sin respuesta)' : a.respuesta;
      item.append(q, v);
      td.appendChild(item);
    }

    detailTr.appendChild(td);
    tr.after(detailTr);
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
