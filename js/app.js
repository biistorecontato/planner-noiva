/* Planner de Casamento — Universo Noiva da Bi
   Renderização das telas a partir de schema.js. */

const S = () => Store.state;
const $main = () => document.getElementById('main');

/* ---------- utilitários ---------- */

function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k in el && k !== 'list') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const num = v => (Number.isFinite(+v) ? +v : 0);
const brl = v => num(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

// Campo de dinheiro: "50000" vira "50.000"; a vírgula separa os centavos (até 2 casas).
function moneyMask(text) {
  const [int, ...dec] = text.replace(/\./g, '').replace(/[^\d,]/g, '').split(',');
  const inteiro = int.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec.length ? `${inteiro || '0'},${dec.join('').slice(0, 2)}` : inteiro;
}
const moneyValue = text => { const s = moneyMask(text).replace(/\./g, '').replace(',', '.'); return s && s !== '.' ? String(+s) : ''; };
const moneyText = v => (v === '' || v == null || !Number.isFinite(+v) ? ''
  : (+v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
// Recoloca o cursor depois de pôr os pontos, contando dígitos a partir do fim.
function moneyCaret(text, digitsAfter) {
  let pos = text.length;
  for (let n = 0; pos > 0 && n < digitsAfter; pos--) if (/[\d,]/.test(text[pos - 1])) n++;
  return pos;
}

function parseDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fmtDate(iso, opts = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
  const d = parseDate(iso);
  return d ? d.toLocaleDateString('pt-BR', opts) : '';
}

function daysUntil(iso) {
  const d = parseDate(iso);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  heart: 'M12 20s-7.5-4.6-9.3-9.2C1.4 7.4 3.6 4 7 4c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8C19.5 15.4 12 20 12 20z',
  check: 'M4 12.5 9 17.5 20 6.5',
  store: 'M4 9h16l-1.5-5h-13zM5 9v11h14V9M9 20v-6h6v6',
  wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-3v3M16 13.5h.01',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M18 15a5 5 0 0 1 4 5v1',
  rings: 'M9 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM15 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12z',
  palette: 'M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.5-1.5 0-1.3-1-1.5-1-2.5 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.1-4-7.5-9-7.5zM7.5 11h.01M10 7h.01M15 7h.01',
  sparkle: 'M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  note: 'M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h6',
  cloud: 'M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM9 9l11-2',
  civil: 'M6 3h9l3 3v15H6zM14 3v4h4M9 11h6M9 15h3M15 19.5l1.2-2.5 1.3 2.5',
  play: 'M8 5.5v13l11-6.5z',
};

function icon(name, cls = 'icon') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', ICONS[name]);
  svg.append(p);
  return svg;
}

/* ---------- acesso aos dados ---------- */

function checklist(id, defaults) {
  const list = S().checks[id] || (S().checks[id] = []);
  // Mantém listas já salvas em dia com o planner: itens padrão novos entram na posição certa,
  // itens padrão que saíram do planner somem (a menos que já estejam marcados).
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].padrao && !list[i].done && !defaults.includes(list[i].text)) list.splice(i, 1);
  }
  defaults.forEach((text, i) => {
    if (list.some(x => x.text === text)) return;
    const prev = i > 0 ? list.findIndex(x => x.text === defaults[i - 1]) : -1;
    list.splice(prev + 1, 0, { id: uid(), text, done: false, padrao: true });
  });
  return list;
}

/* Definição da tabela no schema (com as linhas padrão), para quem a acessa só pelo id. */
function tableDef(id) {
  for (const s of SECOES) for (const b of s.blocos || []) if (b.tipo === 'tabela' && b.id === id) return b;
  return { id };
}

function table(block) {
  if (!block.colunas) block = tableDef(block.id);
  if (!S().tables[block.id]) S().tables[block.id] = (block.padrao || []).map(r => ({ id: uid(), ...r }));
  return S().tables[block.id];
}

function periodProgress(p) {
  const items = checklist(p.id, p.itens);
  return { done: items.filter(i => i.done).length, total: items.length };
}

function overallProgress() {
  return PERIODOS.reduce((acc, p) => {
    const { done, total } = periodProgress(p);
    return { done: acc.done + done, total: acc.total + total };
  }, { done: 0, total: 0 });
}

function currentPeriod() {
  const days = daysUntil(S().fields.data);
  if (days == null) return null;
  const months = days / 30.44;
  if (months >= 12) return PERIODOS[0];
  const eligible = PERIODOS.filter(p => p.meses >= months);
  return eligible.length ? eligible[eligible.length - 1] : PERIODOS[PERIODOS.length - 1];
}

function finance() {
  const rows = table({ id: 'pagamentos' });
  const orcamento = num(S().fields.orcamento_total);
  let contratado = 0, pago = 0;
  const porCategoria = {};
  for (const r of rows) {
    const total = num(r.total);
    const p = r.quitado ? total : Math.min(num(r.pago), total || Infinity);
    contratado += total;
    pago += p;
    const c = r.categoria || 'Sem categoria';
    porCategoria[c] = porCategoria[c] || { total: 0, pago: 0 };
    porCategoria[c].total += total;
    porCategoria[c].pago += p;
  }
  return { orcamento, contratado, pago, pendente: contratado - pago, disponivel: orcamento - contratado, porCategoria };
}

function guests() {
  const rows = table({ id: 'convidados' });
  const g = { previstos: 0, confirmados: 0, aguardando: 0, naoVao: 0, criancas: 0, convites: 0, nomes: rows.length };
  for (const r of rows) {
    const q = r.quantidade === '' || r.quantidade == null ? 1 : num(r.quantidade);
    g.previstos += q;
    if (r.confirmou === 'Sim') g.confirmados += q;
    else if (r.confirmou === 'Não') g.naoVao += q;
    else g.aguardando += q;
    if (r.confirmou !== 'Não') g.criancas += num(r.criancas);
    if (r.convite) g.convites++;
  }
  return g;
}

/* ---------- navegação ---------- */

function route() {
  const [sec, sub] = location.hash.replace(/^#\/?/, '').split('/');
  return { sec: SECOES.some(s => s.id === sec) ? sec : 'inicio', sub };
}

function go(sec, sub) {
  location.hash = '#/' + sec + (sub ? '/' + sub : '');
}

function renderNav() {
  const { sec } = route();
  const nav = document.getElementById('nav');
  nav.replaceChildren(...SECOES.map(s => {
    let badge = null;
    if (s.id === 'checklist') {
      const { done, total } = overallProgress();
      badge = h('span', { class: 'badge', text: pct(done, total) + '%' });
    }
    return h('a', { class: 'nav-link' + (s.id === sec ? ' active' : ''), href: '#/' + s.id,
      onclick: () => document.body.classList.remove('menu-open') }, icon(s.icone), h('span', { text: s.id === 'conta' && Store.managed ? 'Minha conta' : s.titulo }), badge);
  }));
  const f = S().fields;
  document.getElementById('brand-names').textContent = f.noivos || '';
  document.getElementById('brand-date').textContent = f.data ? fmtDate(f.data, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
}

function render() {
  const { sec, sub } = route();
  const def = SECOES.find(s => s.id === sec);
  const main = $main();
  const scroll = window.scrollY;
  const gate = !Store.ready ? renderLoading()
    : recoveryMode ? renderNewPassword()
    : Store.managed && !Store.user ? renderAuth()
    : null;
  document.body.classList.toggle('auth-mode', !!gate);
  if (gate) {
    main.replaceChildren(gate);
    return scroll;
  }
  let content;
  if (sec === 'inicio') content = renderDashboard();
  else if (sec === 'checklist') content = renderChecklistPage(sub);
  else if (sec === 'conta') content = renderConta();
  else content = [pageHeader(def.titulo, def.subtitulo), ...def.blocos.map(renderBlock)];
  main.replaceChildren(...[].concat(content));
  renderNav();
  return scroll;
}

function rerender() {
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
}

function pageHeader(title, subtitle) {
  return h('header', { class: 'page-header' },
    h('h1', { text: title }),
    subtitle ? h('p', { class: 'page-sub', text: subtitle }) : null);
}

/* ---------- blocos genéricos ---------- */

function renderBlock(b) {
  switch (b.tipo) {
    case 'campos': return renderFields(b);
    case 'chips': return renderChips(b);
    case 'checklist': return renderChecklist(b.id, b.itens, b);
    case 'tabela': return renderTable(b);
    case 'resumoFinanceiro': return renderFinanceSummary();
    case 'resumoConvidados': return renderGuestSummary();
    case 'encerramento': return renderClosing();
    case 'dica': return renderTip(b);
    case 'atalho': return card(b.titulo, b.texto, h('button', { class: 'btn', type: 'button', onclick: () => go(...b.destino) }, b.botao));
    case 'ordensEntrada': return renderEntryOrders();
    case 'sugestoesMusica': return renderSongSuggestions();
    case 'saidas': return renderExits();
    case 'paletas': return renderPalettes();
    case 'ideias': return renderIdeas();
    case 'divisaoOrcamento': return renderBudgetSplit();
  }
}

function card(title, text, ...body) {
  return h('section', { class: 'card' },
    title ? h('h2', { class: 'card-title', text: title }) : null,
    text ? h('p', { class: 'card-text', text }) : null,
    ...body);
}

function fieldInput(key, label, type = 'text', store = S().fields, onChange, options) {
  const value = store[key] ?? '';
  const update = e => {
    const el = e.target;
    store[key] = el.type === 'checkbox' ? el.checked : el.value;
    Store.save();
    if (onChange) onChange(key, store[key]);
  };
  let input;
  if (type.startsWith('textarea')) {
    input = h('textarea', { rows: type === 'textarea-lg' ? 14 : 3, value, oninput: update, 'aria-label': label || 'Anotações' });
  } else if (type === 'select') {
    input = h('select', { onchange: update, 'aria-label': label },
      h('option', { value: '', text: '—' }),
      options.map(o => h('option', { value: o, text: o, selected: value === o })));
  } else if (type === 'money') {
    // Mostra 50.000,00 enquanto digita, mas guarda o número puro (50000).
    const onMoney = e => {
      const el = e.target;
      const digitsAfter = el.value.slice(el.selectionStart).replace(/[^\d,]/g, '').length;
      el.value = moneyMask(el.value);
      const pos = moneyCaret(el.value, digitsAfter);
      el.setSelectionRange(pos, pos);
      store[key] = moneyValue(el.value);
      Store.save();
      if (onChange) onChange(key, store[key]);
    };
    input = h('div', { class: 'money' }, h('span', { text: 'R$' }),
      h('input', { type: 'text', inputMode: 'decimal', value: moneyText(value), oninput: onMoney,
        onblur: e => { if (e.target.value) e.target.value = moneyText(moneyValue(e.target.value)); }, 'aria-label': label }));
  } else {
    input = h('input', { type: type === 'tel' ? 'tel' : type, value, oninput: update, 'aria-label': label,
      inputMode: type === 'number' ? 'numeric' : null, min: type === 'number' ? '0' : null });
  }
  const wide = type.startsWith('textarea');
  return h('label', { class: 'field' + (wide ? ' wide' : '') }, label ? h('span', { class: 'field-label', text: label }) : null, input);
}

function renderFields(b) {
  return card(b.titulo, b.texto, h('div', { class: 'fields' },
    b.campos.map(([k, label, type, options]) => fieldInput(k, label, type, S().fields, key => {
      if (key === 'noivos' || key === 'data') renderNav();
    }, options))));
}

function chipGroup(key, opcoes, onToggle) {
  const selected = S().chips[key] || (S().chips[key] = []);
  const chip = opt => h('button', {
    type: 'button', class: 'chip' + (selected.includes(opt) ? ' on' : ''), text: opt, 'aria-pressed': String(selected.includes(opt)),
    onclick: e => {
      const i = selected.indexOf(opt);
      i >= 0 ? selected.splice(i, 1) : selected.push(opt);
      e.currentTarget.classList.toggle('on');
      e.currentTarget.setAttribute('aria-pressed', String(i < 0));
      Store.save();
      if (onToggle) onToggle();
    },
  });
  return h('div', { class: 'chips' }, opcoes.map(chip));
}

function renderChips(b) {
  return card(b.titulo, b.texto,
    chipGroup(b.chave, b.opcoes),
    h('div', { class: 'fields' }, fieldInput(b.chave + '_outro', 'Outra palavra')));
}

function renderChecklist(id, defaults, opts = {}) {
  const items = checklist(id, defaults);
  const done = items.filter(i => i.done).length;
  const list = h('ul', { class: 'checklist' }, items.map(item =>
    h('li', { class: item.done ? 'done' : '' },
      h('label', {},
        h('input', { type: 'checkbox', checked: item.done, onchange: e => { item.done = e.target.checked; Store.save(); rerender(); } }),
        h('span', { text: item.text })),
      item.padrao ? null : h('button', { class: 'icon-btn', type: 'button', title: 'Remover item', 'aria-label': 'Remover item',
        onclick: () => { items.splice(items.indexOf(item), 1); Store.save(); rerender(); } }, icon('trash')))));
  const addInput = h('input', { type: 'text', placeholder: 'Adicionar outro item…', 'aria-label': 'Novo item' });
  const add = () => {
    const text = addInput.value.trim();
    if (!text) return;
    items.push({ id: uid(), text, done: false });
    Store.save();
    rerender();
  };
  addInput.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
  return h('section', { class: 'card' },
    opts.titulo ? h('div', { class: 'card-head' }, h('h2', { class: 'card-title', text: opts.titulo }),
      h('span', { class: 'count', text: `${done}/${items.length}` })) : null,
    progressBar(done, items.length),
    opts.observacao ? h('div', { class: 'callout' }, h('strong', { text: 'Observação importante' }),
      opts.observacao.map(t => h('p', { text: t }))) : null,
    list,
    h('div', { class: 'add-row' }, addInput, h('button', { class: 'btn ghost', type: 'button', onclick: add }, icon('plus'), 'Adicionar')),
    opts.notas ? h('div', { class: 'fields' }, opts.notas.map((n, i) => fieldInput(`${id}_nota_${i}`, n, 'textarea'))) : null);
}

function progressBar(done, total) {
  return h('div', { class: 'progress', role: 'progressbar', 'aria-valuenow': pct(done, total), 'aria-valuemin': 0, 'aria-valuemax': 100 },
    h('div', { class: 'progress-fill', style: `width:${pct(done, total)}%` }));
}

function rowHasData(row) {
  return Object.entries(row).some(([k, v]) => k !== 'id' && v !== '' && v != null && v !== false);
}

const tableFilters = {};

function renderTable(b) {
  const rows = table(b);
  const f = tableFilters[b.id] || (tableFilters[b.id] = { q: '', grupo: '' });
  let shown = rows;
  if (b.filtroGrupo) {
    const q = f.q.toLowerCase();
    shown = rows.filter(r => (!f.grupo || r.grupo === f.grupo) && (!q || (r.nome || '').toLowerCase().includes(q)));
  }
  if (b.ordenarPor) {
    const k = b.ordenarPor;
    shown = [...shown].sort((a, c) => (a[k] || '99') .localeCompare(c[k] || '99'));
  }

  const addRow = () => {
    rows.push({ id: uid(), ...(b.novo || {}) });
    Store.save();
    rerender();
    const cards = document.querySelectorAll(`[data-table="${b.id}"] .row-card`);
    const last = cards[cards.length - 1];
    if (last) { last.scrollIntoView({ behavior: 'smooth', block: 'center' }); last.querySelector('input,select,textarea')?.focus({ preventScroll: true }); }
  };

  const rowCard = (row) => {
    const i = rows.indexOf(row);
    // Tabelas com "cores": cada linha vira um bloco com cor, número e nome próprios.
    let head = null, onEdit = () => refreshSummaries();
    if (b.cores) {
      const base = b.rotuloNovo.replace('Adicionar ', '');
      const titleOf = () => b.rotuloLinha(row) || `${base[0].toUpperCase() + base.slice(1)} ${i + 1}`;
      const title = h('strong', { text: titleOf() });
      head = h('div', { class: 'row-head' }, h('span', { class: 'row-badge', text: String(i + 1) }), title);
      onEdit = () => { title.textContent = titleOf(); refreshSummaries(); };
    }
    const tools = h('div', { class: 'row-tools' },
      b.ordenavel ? h('span', { class: 'row-num', text: String(i + 1) }) : null,
      b.ordenavel ? h('button', { class: 'icon-btn', type: 'button', title: 'Subir', 'aria-label': 'Subir', disabled: i === 0,
        onclick: () => { [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]]; Store.save(); rerender(); } }, icon('up')) : null,
      b.ordenavel ? h('button', { class: 'icon-btn', type: 'button', title: 'Descer', 'aria-label': 'Descer', disabled: i === rows.length - 1,
        onclick: () => { [rows[i + 1], rows[i]] = [rows[i], rows[i + 1]]; Store.save(); rerender(); } }, icon('down')) : null,
      h('button', { class: 'icon-btn', type: 'button', title: 'Remover', 'aria-label': 'Remover linha',
        onclick: () => {
          if (rowHasData(row) && !confirm('Remover esta linha?')) return;
          rows.splice(rows.indexOf(row), 1);
          Store.save();
          rerender();
        } }, icon('trash')));
    const cells = b.colunas.map(([k, label, type, options]) => {
      if (type === 'select') {
        return h('label', { class: 'field' }, h('span', { class: 'field-label', text: label }),
          h('select', { onchange: e => { row[k] = e.target.value; Store.save(); onEdit(); } },
            h('option', { value: '', text: '—' }),
            options.map(o => h('option', { value: o, text: o, selected: row[k] === o }))));
      }
      if (type === 'check') {
        return h('label', { class: 'field check-field' },
          h('input', { type: 'checkbox', checked: !!row[k], onchange: e => { row[k] = e.target.checked; Store.save(); onEdit(); } }),
          h('span', { text: label }));
      }
      return fieldInput(k, label, type || 'text', row, onEdit);
    });
    if (!b.cores) return h('div', { class: 'row-card' }, tools, h('div', { class: 'row-fields' }, cells));
    const [bg, line] = CORES_LINHA[i % CORES_LINHA.length];
    return h('div', { class: 'row-card tinted', style: `--tint:${bg};--tint-line:${line}` }, tools, head, h('div', { class: 'row-fields' }, cells));
  };

  const filters = b.filtroGrupo ? h('div', { class: 'filters' },
    h('input', { type: 'search', placeholder: 'Buscar por nome…', value: f.q, 'aria-label': 'Buscar convidado',
      oninput: e => { f.q = e.target.value; const pos = e.target.selectionStart; rerender();
        const el = document.querySelector(`[data-table="${b.id}"] .filters input`); el.focus(); el.setSelectionRange(pos, pos); } }),
    h('select', { 'aria-label': 'Filtrar por grupo', onchange: e => { f.grupo = e.target.value; rerender(); } },
      h('option', { value: '', text: 'Todos os grupos' }),
      b.colunas.find(c => c[0] === 'grupo')[3].map(g => h('option', { value: g, text: g, selected: f.grupo === g })))) : null;

  return h('section', { class: 'card', 'data-table': b.id },
    h('div', { class: 'card-head' }, h('h2', { class: 'card-title', text: b.titulo }),
      h('span', { class: 'count', text: `${rows.length} ${rows.length === 1 ? 'item' : 'itens'}` })),
    b.texto ? h('p', { class: 'card-text', text: b.texto }) : null,
    filters,
    shown.length ? h('div', { class: 'rows' + (b.cores ? ' tinted-rows' : '') }, shown.map(rowCard))
      : h('p', { class: 'empty', text: rows.length ? 'Nada encontrado com esse filtro.' : 'Nenhum item ainda.' }),
    h('button', { class: 'btn', type: 'button', onclick: addRow }, icon('plus'), b.rotuloNovo || 'Adicionar'));
}

/* Atualiza os cards de resumo sem redesenhar a tela (preserva o foco). */
function refreshSummaries() {
  const renderers = { finance: renderFinanceSummary, guests: renderGuestSummary, budget: renderBudgetSplit };
  document.querySelectorAll('[data-summary]').forEach(el => el.replaceWith(renderers[el.dataset.summary]()));
}

function stat(label, value, tone) {
  return h('div', { class: 'stat' + (tone ? ' ' + tone : '') }, h('span', { class: 'stat-label', text: label }), h('strong', { text: value }));
}

function renderFinanceSummary() {
  const fin = finance();
  const cats = Object.entries(fin.porCategoria).sort((a, b) => b[1].total - a[1].total);
  return h('section', { class: 'card', 'data-summary': 'finance' },
    h('h2', { class: 'card-title', text: 'Controle financeiro' }),
    h('div', { class: 'fields' }, fieldInput('orcamento_total', 'Orçamento total previsto', 'money', S().fields, () => {
      const el = document.querySelector('[data-summary="finance"] .stats');
      if (el) el.replaceWith(renderFinanceSummary().querySelector('.stats'));
      document.querySelector('[data-summary="budget"]')?.replaceWith(renderBudgetSplit());
    })),
    h('div', { class: 'stats' },
      stat('Contratado', brl(fin.contratado)),
      stat('Já pago', brl(fin.pago), 'good'),
      stat('Pendente', brl(fin.pendente), fin.pendente > 0 ? 'warn' : ''),
      stat('Disponível', brl(fin.disponivel), fin.disponivel < 0 ? 'bad' : ''),
      fin.orcamento ? h('div', { class: 'stat wide' }, h('span', { class: 'stat-label', text: `${pct(fin.contratado, fin.orcamento)}% do orçamento comprometido` }),
        progressBar(Math.min(fin.contratado, fin.orcamento), fin.orcamento)) : null),
    cats.length ? h('table', { class: 'mini-table' },
      h('thead', {}, h('tr', {}, h('th', { text: 'Categoria' }), h('th', { text: 'Contratado' }), h('th', { text: 'Pago' }))),
      h('tbody', {}, cats.map(([c, v]) => h('tr', {}, h('td', { text: c }), h('td', { text: brl(v.total) }), h('td', { text: brl(v.pago) }))))) : null);
}

function renderGuestSummary() {
  const g = guests();
  return h('section', { class: 'card', 'data-summary': 'guests' },
    h('h2', { class: 'card-title', text: 'Confirmação de presença' }),
    h('div', { class: 'stats' },
      stat('Convidados previstos', g.previstos),
      stat('Confirmados', g.confirmados, 'good'),
      stat('Aguardando resposta', g.aguardando, g.aguardando ? 'warn' : ''),
      stat('Não irão', g.naoVao),
      stat('Crianças', g.criancas),
      stat('Convites enviados', `${g.convites}/${g.nomes}`)));
}

function renderBudgetSplit() {
  const fin = finance();
  const body = fin.orcamento
    ? h('table', { class: 'mini-table' },
      h('thead', {}, h('tr', {}, h('th', { text: 'Categoria' }), h('th', { text: 'Sugerido' }), h('th', { text: 'Contratado' }))),
      h('tbody', {}, DIVISAO_ORCAMENTO.map(([nome, p, cats]) => {
        const sugerido = fin.orcamento * p / 100;
        const contratado = cats.reduce((s, c) => s + (fin.porCategoria[c]?.total || 0), 0);
        return h('tr', {}, h('td', {}, nome, h('small', { class: 'pct', text: ` ${p}%` })), h('td', { text: brl(sugerido) }),
          h('td', { class: contratado > sugerido ? 'over' : '', text: brl(contratado) }));
      })))
    : h('p', { class: 'empty', text: 'Informem o orçamento total previsto para ver a divisão sugerida.' });
  return h('section', { class: 'card', 'data-summary': 'budget' },
    h('h2', { class: 'card-title', text: 'Divisão sugerida do orçamento' }),
    h('p', { class: 'card-text', text: 'Um exemplo de divisão comum entre as categorias. Usem como referência e ajustem às prioridades de vocês.' }),
    body);
}

function renderTip(b) {
  return h('section', { class: 'card' },
    h('h2', { class: 'card-title', text: b.titulo }),
    h('ul', { class: 'tip-list' }, b.itens.map(([t, d]) => h('li', {}, h('strong', { text: t }), h('span', { text: d })))));
}

function renderEntryOrders() {
  const use = o => {
    const rows = table({ id: 'ordem' });
    if (rows.some(rowHasData) && !confirm('Substituir a ordem de entrada atual por esta sugestão?')) return;
    S().tables.ordem = o.itens.map(([quem]) => ({ id: uid(), quem }));
    Store.save();
    rerender();
    document.querySelector('[data-table="ordem"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return card('Sugestões de ordem de entrada', 'Três modelos para se inspirar. Escolham um para preencher a ordem de entrada e depois ajustem como quiserem.',
    h('div', { class: 'opt-grid' }, ORDENS_ENTRADA.map(o => h('article', { class: 'opt-card' },
      h('h3', { text: o.titulo }),
      h('p', { class: 'opt-text', text: o.texto }),
      h('ol', { class: 'opt-steps' }, o.itens.map(([quem, obs]) => h('li', {}, h('strong', { text: quem }), h('span', { text: obs })))),
      h('p', { class: 'opt-tip', text: o.dica }),
      h('button', { class: 'btn ghost sm', type: 'button', onclick: () => use(o) }, 'Usar esta ordem')))));
}

let songMoment = 'Entrada da noiva';

function shortMoment(m) {
  const s = m.replace(/^Entrada d[aeo]s? /, '');
  return s[0].toUpperCase() + s.slice(1);
}

function renderSongSuggestions() {
  const rows = table({ id: 'musicas' });
  const sug = MUSICAS.find(m => m.momento === songMoment);
  const row = rows.find(r => r.momento === sug.momento);
  // Tocar de novo na música escolhida desfaz a escolha.
  const choose = ([musica, versao]) => {
    const target = row || (rows.unshift({ id: uid(), momento: sug.momento }), rows[0]);
    Object.assign(target, target.musica === musica ? { musica: '', versao: '' } : { musica, versao });
    Store.save();
    rerender();
  };
  // Com vídeo cadastrado, abre direto tocando; sem ele, abre a busca do YouTube.
  const youtube = ([musica, autor]) => {
    const id = VIDEOS[`${musica}|${autor}`];
    if (id === null) return null;
    return id ? `https://www.youtube.com/watch?v=${id}`
      : 'https://www.youtube.com/results?search_query=' + encodeURIComponent(`${musica} ${autor}`);
  };
  return card('Sugestões de músicas da Bi', 'Escolham o momento, ouçam a prévia e toquem em "Escolher". Para desfazer, toquem de novo em "Escolhida".',
    h('nav', { class: 'tabs' }, MUSICAS.map(m => h('button', { type: 'button', class: 'tab' + (m === sug ? ' active' : ''),
      onclick: () => { songMoment = m.momento; rerender(); } }, h('span', { text: shortMoment(m.momento) })))),
    h('ol', { class: 'song-list' }, sug.lista.map(s => {
      const on = row && row.musica === s[0];
      return h('li', { class: on ? 'on' : '' },
        h('span', {}, h('strong', { text: s[0] }), h('small', { text: s[1] })),
        youtube(s) ? h('a', { class: 'btn sm link-yt', href: youtube(s), target: '_blank', rel: 'noopener', 'aria-label': `Ouvir ${s[0]} no YouTube` },
          icon('play'), 'Ouvir') : null,
        h('button', { class: 'btn sm ' + (on ? '' : 'ghost'), type: 'button', 'aria-pressed': String(!!on),
          title: on ? 'Tocar para desfazer a escolha' : null, onclick: () => choose(s) }, on ? 'Escolhida ✕' : 'Escolher'));
    })),
    h('div', { class: 'callout' }, h('strong', { text: 'Recomendação da Bi' }), h('p', { text: sug.dica })),
    h('p', { class: 'card-text', text: 'Essas sugestões podem ser adaptadas ao estilo da cerimônia e ao formato de apresentação da banda.' }));
}

function renderExits() {
  const f = S().fields;
  return card('Inspirações para a saída dos noivos', 'Cada detalhe importa para que esse momento seja inesquecível.',
    h('div', { class: 'opt-grid' }, SAIDAS.map(([nome, texto, orientacao]) => {
      const on = f.saida_noivos === nome;
      return h('article', { class: 'opt-card' + (on ? ' chosen' : '') },
        h('h3', { text: nome }),
        h('p', { class: 'opt-text', text: texto }),
        h('p', { class: 'opt-tip' }, h('strong', { text: 'Orientação da cerimonialista: ' }), orientacao),
        h('button', { class: 'btn sm ' + (on ? '' : 'ghost'), type: 'button', onclick: () => {
          f.saida_noivos = on ? '' : nome;
          Store.save();
          rerender();
        } }, on ? 'Escolhida ♡' : 'Escolher'));
    })));
}

function renderPalettes() {
  const f = S().fields;
  return card('Paletas de cores para se inspirar', 'Fórmula simples para montar a paleta: 1 cor principal, 2 ou 3 tons de apoio, 1 base neutra e 1 tom de destaque (opcional).',
    h('div', { class: 'opt-grid' }, PALETAS.map(p => {
      const on = f.iv_paleta === p.nome;
      return h('article', { class: 'opt-card' + (on ? ' chosen' : '') },
        h('div', { class: 'swatches' }, p.cores.map(([nome, hex]) => h('span', { class: 'swatch', style: `background:${hex}`, title: nome }))),
        h('h3', { text: p.nome }),
        h('p', { class: 'opt-text', text: p.texto }),
        h('button', { class: 'btn sm ' + (on ? '' : 'ghost'), type: 'button', onclick: () => {
          f.iv_paleta = on ? '' : p.nome;
          if (!on && !f.paleta) f.paleta = p.nome;
          Store.save();
          rerender();
        } }, on ? 'Nossa paleta ♡' : 'Escolher esta paleta'));
    })));
}

function renderIdeas() {
  const total = () => IDEIAS.reduce((s, g) => s + (S().chips[g.chave] || []).length, 0);
  const count = h('span', { class: 'count' });
  const update = () => { const n = total(); count.textContent = n === 1 ? '1 ideia escolhida' : `${n} ideias escolhidas`; };
  update();
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', { class: 'card-title', text: 'Ideias que queremos no nosso casamento' }), count),
    h('p', { class: 'card-text', text: 'Toquem nas ideias que têm a cara de vocês. Inspirem-se, mas não tentem copiar: o casamento precisa contar a história de vocês.' }),
    IDEIAS.map(g => h('div', { class: 'idea-group' }, h('h3', { text: g.titulo }), chipGroup(g.chave, g.opcoes, update))));
}

function renderClosing() {
  return h('section', { class: 'card closing' },
    h('p', { class: 'closing-title', text: TEXTOS.encerramentoTitulo }),
    TEXTOS.encerramento.map(t => h('p', { text: t })),
    h('p', { class: 'signature', text: 'Bi' }));
}

/* ---------- telas especiais ---------- */

function renderDashboard() {
  const f = S().fields;
  const days = daysUntil(f.data);
  const cur = currentPeriod();
  const prog = overallProgress();
  const fin = finance();
  const g = guests();

  let countdown;
  if (days == null) {
    countdown = h('div', { class: 'hero-empty' }, h('p', { text: 'Comecem informando a data e os detalhes principais do casamento.' }),
      h('button', { class: 'btn light', type: 'button', onclick: () => go('dados') }, 'Preencher dados do casamento'));
  } else if (days > 0) {
    countdown = h('div', { class: 'countdown' }, h('span', { class: 'cd-label', text: 'Faltam' }),
      h('strong', { text: days.toLocaleString('pt-BR') }), h('span', { class: 'cd-label', text: days === 1 ? 'dia' : 'dias' }));
  } else {
    countdown = h('div', { class: 'countdown' }, h('strong', { class: 'small', text: days === 0 ? 'É hoje!' : 'Casados! ♡' }));
  }

  const hero = h('section', { class: 'hero' },
    h('p', { class: 'hero-kicker', text: 'Planner completo de casamento' }),
    h('h1', { class: 'hero-names', text: f.noivos || 'Nosso grande dia' }),
    f.data ? h('p', { class: 'hero-date', text: [fmtDate(f.data, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), f.horario].filter(Boolean).join(' · ') }) : null,
    [f.local_cerimonia, f.cidade].some(Boolean) ? h('p', { class: 'hero-place', text: [f.local_cerimonia, f.cidade].filter(Boolean).join(' — ') }) : null,
    countdown);

  // tarefas da etapa atual e das etapas anteriores ainda abertas
  const tasks = [];
  if (cur) {
    for (const p of PERIODOS) {
      if (p.meses < cur.meses) break;
      for (const item of checklist(p.id, p.itens)) if (!item.done) tasks.push({ p, item, late: p !== cur });
    }
  } else {
    const p = PERIODOS[0];
    for (const item of checklist(p.id, p.itens)) if (!item.done) tasks.push({ p, item, late: false });
  }
  const taskList = tasks.slice(0, 7);
  const tasksCard = card(cur ? `Etapa atual: ${cur.titulo}` : 'Primeiros passos', cur ? cur.subtitulo : null,
    taskList.length ? h('ul', { class: 'checklist' }, taskList.map(({ p, item, late }) =>
      h('li', {}, h('label', {},
        h('input', { type: 'checkbox', onchange: () => { item.done = true; Store.save(); rerender(); } }),
        h('span', { text: item.text }),
        late ? h('em', { class: 'tag late', text: p.titulo }) : null))))
      : h('p', { class: 'empty', text: 'Tudo em dia nesta etapa. ♡' }),
    h('button', { class: 'btn ghost', type: 'button', onclick: () => go('checklist', (cur || PERIODOS[0]).id) }, 'Ver checklist completo'));

  const pagamentos = table({ id: 'pagamentos' })
    .filter(r => !r.quitado && r.vencimento)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .slice(0, 5);

  return [
    hero,
    h('div', { class: 'grid-2' },
      h('section', { class: 'card clickable', onclick: () => go('checklist') },
        h('h2', { class: 'card-title', text: 'Checklist' }),
        h('p', { class: 'big', text: pct(prog.done, prog.total) + '%' }),
        progressBar(prog.done, prog.total),
        h('p', { class: 'card-text', text: `${prog.done} de ${prog.total} tarefas concluídas` })),
      h('section', { class: 'card clickable', onclick: () => go('convidados') },
        h('h2', { class: 'card-title', text: 'Convidados' }),
        h('p', { class: 'big', text: String(g.confirmados) }),
        h('p', { class: 'card-text', text: `confirmados de ${g.previstos} previstos · ${g.aguardando} aguardando` }))),
    tasksCard,
    h('div', { class: 'grid-2' },
      h('section', { class: 'card clickable', onclick: () => go('financeiro') },
        h('h2', { class: 'card-title', text: 'Orçamento' }),
        h('div', { class: 'stats compact' },
          stat('Previsto', brl(fin.orcamento)),
          stat('Contratado', brl(fin.contratado)),
          stat('Já pago', brl(fin.pago), 'good'),
          stat('Disponível', brl(fin.disponivel), fin.disponivel < 0 ? 'bad' : ''))),
      h('section', { class: 'card' },
        h('h2', { class: 'card-title', text: 'Próximos pagamentos' }),
        pagamentos.length ? h('ul', { class: 'pay-list' }, pagamentos.map(r => {
          const d = daysUntil(r.vencimento);
          return h('li', { class: d < 0 ? 'late' : '' },
            h('span', {}, h('strong', { text: r.fornecedor || r.categoria || 'Pagamento' }), h('small', { text: fmtDate(r.vencimento) + (d < 0 ? ' · vencido' : '') })),
            h('span', { text: brl(num(r.total) - num(r.pago)) }));
        })) : h('p', { class: 'empty', text: 'Nenhum vencimento cadastrado.' }),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => go('financeiro') }, 'Abrir financeiro'))),
    h('details', { class: 'card letter' },
      h('summary', { text: 'Um recado importante antes de começar' }),
      h('p', { class: 'closing-title', text: TEXTOS.recadoTitulo }),
      TEXTOS.recado.map(t => h('p', { text: t })),
      h('p', { class: 'card-text', text: TEXTOS.comoUsar }),
      h('p', { class: 'signature', text: 'Bi' })),
    h('details', { class: 'card letter' },
      h('summary', { text: 'Antes de casar, leia isso' }),
      h('h3', { class: 'sub-title', text: 'A ordem inteligente do planejamento' }),
      h('ol', { class: 'opt-steps' }, TEXTOS.ordemInteligente.map(t => h('li', {}, h('strong', { text: t })))),
      h('p', { class: 'card-text', text: TEXTOS.prioridades }),
      h('h3', { class: 'sub-title', text: '15 erros que os noivos cometem' }),
      h('ul', { class: 'tip-list' }, TEXTOS.erros.map(([t, d]) => h('li', {}, h('strong', { text: t }), h('span', { text: d }))))),
  ];
}

function renderChecklistPage(sub) {
  const cur = currentPeriod();
  const dia = PERIODOS.find(x => x.id === 'pdia');
  // Aba "Para o grande dia": o checklist do dia (um período) e as listas da noiva, do noivo e do kit.
  const grandeDia = [{ ...dia, aba: dia.titulo }, ...LISTAS_GRANDE_DIA];
  const p = PERIODOS.find(x => x.id === sub) || LISTAS_GRANDE_DIA.find(x => x.id === sub) || cur || PERIODOS[0];
  const prog = overallProgress();
  const tab = (x, label) => {
    const items = checklist(x.id, x.itens);
    const done = items.filter(i => i.done).length;
    return h('a', { href: `#/checklist/${x.id}`, class: 'tab' + (x.id === p.id ? ' active' : '') + (x.id === cur?.id ? ' current' : '') + (done === items.length ? ' complete' : '') },
      h('span', { text: label }), h('small', { text: `${done}/${items.length}` }));
  };
  const tabRow = (titulo, list, labelOf) => {
    const nav = h('nav', { class: 'tabs', 'aria-label': titulo }, list.map(x => tab(x, labelOf(x))));
    requestAnimationFrame(() => {
      const active = nav.querySelector('.tab.active');
      if (active) nav.scrollLeft = active.offsetLeft - nav.offsetLeft - 8;
    });
    return h('div', { class: 'tab-group' }, h('span', { class: 'tab-group-label', text: titulo }), nav);
  };
  return [
    pageHeader('Checklist', `${prog.done} de ${prog.total} tarefas do planejamento concluídas`),
    tabRow('Por período', PERIODOS.filter(x => x !== dia), x => x.titulo),
    tabRow('Para o grande dia', grandeDia, x => x.aba),
    h('div', { class: 'period-head' },
      h('h2', { text: p.titulo }),
      h('p', { text: p.subtitulo }),
      p === cur ? h('span', { class: 'tag', text: 'Etapa atual' }) : null),
    renderChecklist(p.id, p.itens, { observacao: p.observacao, notas: p.notas }),
  ];
}

function renderConta() {
  const out = [pageHeader(Store.managed ? 'Minha conta' : 'Conta e backup',
    Store.managed ? null : 'Sincronize o planner entre celular e computador e guarde uma cópia de segurança.')];
  const cfg = Store.getConfig() || window.APP_CONFIG;

  if (Store.managed && Store.user) {
    const pass = passwordInput('Mínimo 6 caracteres', 'new-password');
    const msg = h('p', { class: 'form-msg', role: 'alert' });
    out.push(card('Sua conta', null,
      h('p', {}, 'Você entrou como ', h('strong', { text: Store.user.email })),
      h('p', { class: 'card-text', text: 'Tudo o que você preenche é salvo automaticamente. Para acessar em outro aparelho, abra o app e entre com o mesmo e-mail e senha.' }),
      h('button', { class: 'btn ghost', type: 'button', onclick: async () => { await Store.signOut(); go('inicio'); } }, 'Sair da conta')));
    out.push(card('Alterar senha', null,
      h('div', { class: 'fields' }, h('label', { class: 'field' }, h('span', { class: 'field-label', text: 'Nova senha' }), pass)),
      msg,
      h('button', { class: 'btn ghost', type: 'button', onclick: async () => {
        if (pass.value.length < 6) { msg.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; return; }
        const err = await Store.updatePassword(pass.value);
        msg.textContent = err ? 'Não foi possível alterar a senha.' : 'Senha alterada.';
        pass.value = '';
      } }, 'Salvar nova senha')));
  } else if (!Store.connected) {
    const url = h('input', { type: 'url', placeholder: 'https://xxxx.supabase.co', value: cfg?.url || '' });
    const key = h('input', { type: 'text', placeholder: 'chave pública (anon key)', value: cfg?.anonKey || '' });
    const msg = h('p', { class: 'form-msg' });
    out.push(card('Sincronização na nuvem',
      'Sem sincronização, o planner fica salvo apenas neste aparelho. Para acessar de qualquer lugar, conecte ao banco de dados Supabase.',
      h('div', { class: 'fields' },
        h('label', { class: 'field' }, h('span', { class: 'field-label', text: 'URL do projeto Supabase' }), url),
        h('label', { class: 'field' }, h('span', { class: 'field-label', text: 'Chave pública (anon key)' }), key)),
      msg,
      h('button', { class: 'btn', type: 'button', onclick: async () => {
        msg.textContent = 'Conectando…';
        const ok = await Store.connect({ url: url.value.trim(), anonKey: key.value.trim() });
        msg.textContent = ok ? '' : 'Não foi possível conectar. Confira a URL e a chave.';
        if (ok) rerender();
      } }, 'Conectar')));
  } else if (!Store.user) {
    const email = h('input', { type: 'email', autocomplete: 'email', placeholder: 'seu@email.com' });
    const pass = h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'mínimo 6 caracteres' });
    const msg = h('p', { class: 'form-msg' });
    const act = async (fn) => {
      if (!email.value || pass.value.length < 6) { msg.textContent = 'Informe e-mail e senha (mínimo 6 caracteres).'; return; }
      msg.textContent = 'Aguarde…';
      if (fn === 'in') {
        const err = await Store.signIn(email.value.trim(), pass.value);
        msg.textContent = err ? 'E-mail ou senha incorretos.' : '';
      } else {
        const { error, needsConfirmation } = await Store.signUp(email.value.trim(), pass.value);
        msg.textContent = error ? error.message : needsConfirmation ? 'Conta criada! Confirme pelo link enviado ao seu e-mail e depois entre.' : '';
      }
      setTimeout(rerender, 300);
    };
    out.push(card('Entrar na sua conta', 'Use a mesma conta no celular e no computador. Os noivos podem compartilhar o mesmo login.',
      h('div', { class: 'fields' },
        h('label', { class: 'field' }, h('span', { class: 'field-label', text: 'E-mail' }), email),
        h('label', { class: 'field' }, h('span', { class: 'field-label', text: 'Senha' }), pass)),
      msg,
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', onclick: () => act('in') }, 'Entrar'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => act('up') }, 'Criar conta'),
        h('button', { class: 'btn link', type: 'button', onclick: () => { Store.disconnect(); rerender(); } }, 'Desconectar banco de dados'))));
  } else {
    out.push(card('Sincronização ativa', null,
      h('p', {}, 'Conectado como ', h('strong', { text: Store.user.email })),
      h('p', { class: 'card-text', text: 'Tudo o que vocês preencherem é salvo automaticamente na nuvem.' }),
      h('button', { class: 'btn ghost', type: 'button', onclick: async () => { await Store.signOut(); rerender(); } }, 'Sair da conta')));
  }

  const file = h('input', { type: 'file', accept: 'application/json', hidden: true, onchange: async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data.fields || !data.tables) throw new Error();
      if (!confirm('Substituir o planner atual pelos dados deste arquivo?')) return;
      Store.replace(data);
      rerender();
      alert('Backup restaurado.');
    } catch { alert('Arquivo inválido.'); }
  } });

  if (!Store.managed) out.push(card('Backup', 'Baixe uma cópia do planner para guardar ou levar para outro aparelho.',
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn', type: 'button', onclick: () => {
        const blob = new Blob([JSON.stringify(S(), null, 2)], { type: 'application/json' });
        const a = h('a', { href: URL.createObjectURL(blob), download: `planner-casamento-${new Date().toISOString().slice(0, 10)}.json` });
        a.click();
        URL.revokeObjectURL(a.href);
      } }, 'Baixar backup'),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => file.click() }, 'Restaurar backup'),
      file)));

  out.push(card('Recomeçar', 'Apaga todas as informações preenchidas neste planner.',
    h('button', { class: 'btn danger', type: 'button', onclick: () => {
      if (!confirm('Tem certeza? Todas as informações do planner serão apagadas.')) return;
      if (!confirm('Esta ação não pode ser desfeita. Apagar tudo?')) return;
      Store.replace({});
      go('inicio');
    } }, 'Apagar tudo')));
  return out;
}

/* ---------- entrada (login e cadastro) ---------- */

let recoveryMode = false;
let authTab = 'entrar';
let pendingNames = '';

function authBrand() {
  return h('div', { class: 'auth-brand' },
    h('span', { class: 'brand-top', text: 'Universo' }),
    h('span', { class: 'brand-mid', text: 'Noiva' }),
    h('span', { class: 'brand-script', text: 'da Bi' }),
    h('p', { class: 'auth-kicker', text: 'Planner completo de casamento' }));
}

function renderLoading() {
  return h('div', { class: 'auth-wrap' }, h('div', { class: 'auth-card' }, authBrand(), h('p', { class: 'empty', text: 'Carregando…' })));
}

function passwordInput(placeholder, autocomplete) {
  return h('input', { type: 'password', placeholder, autocomplete, minLength: 6 });
}

function renderAuth() {
  const msg = h('p', { class: 'form-msg', role: 'alert' });
  const email = h('input', { type: 'email', autocomplete: 'email', placeholder: 'seu@email.com', required: true });
  const label = (text, input) => h('label', { class: 'field' }, h('span', { class: 'field-label', text }), input);
  const tab = (id, text) => h('button', { type: 'button', class: 'auth-tab' + (authTab === id ? ' active' : ''), text,
    onclick: () => { authTab = id; rerender(); } });

  let form;
  if (authTab === 'entrar') {
    const pass = passwordInput('Sua senha', 'current-password');
    form = h('form', { class: 'auth-form', onsubmit: async e => {
      e.preventDefault();
      msg.textContent = 'Entrando…';
      const err = await Store.signIn(email.value.trim(), pass.value);
      msg.textContent = !err ? '' : /confirm/i.test(err.message)
        ? 'Confirme seu cadastro pelo link enviado ao seu e-mail.' : 'E-mail ou senha incorretos.';
    } },
      label('E-mail', email), label('Senha', pass), msg,
      h('button', { class: 'btn', type: 'submit' }, 'Entrar'),
      h('button', { class: 'btn link', type: 'button', onclick: () => { authTab = 'esqueci'; rerender(); } }, 'Esqueci minha senha'));
  } else if (authTab === 'criar') {
    const nomes = h('input', { type: 'text', placeholder: 'Ex.: Ana & Pedro', autocomplete: 'off' });
    const pass = passwordInput('Mínimo 6 caracteres', 'new-password');
    form = h('form', { class: 'auth-form', onsubmit: async e => {
      e.preventDefault();
      if (pass.value.length < 6) { msg.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; return; }
      msg.textContent = 'Criando sua conta…';
      pendingNames = nomes.value.trim();
      const { error, needsConfirmation } = await Store.signUp(email.value.trim(), pass.value);
      if (error) {
        msg.textContent = /registered|exists/i.test(error.message) ? 'Este e-mail já tem conta. Use "Entrar".' : 'Não foi possível criar a conta. Tente novamente.';
      } else if (needsConfirmation) {
        msg.textContent = 'Conta criada! Enviamos um link de confirmação para o seu e-mail. Depois de confirmar, é só entrar.';
      }
    } },
      label('Nome dos noivos', nomes), label('E-mail', email), label('Crie uma senha', pass), msg,
      h('button', { class: 'btn', type: 'submit' }, 'Criar minha conta'));
  } else {
    form = h('form', { class: 'auth-form', onsubmit: async e => {
      e.preventDefault();
      msg.textContent = 'Enviando…';
      const err = await Store.resetPassword(email.value.trim());
      msg.textContent = err ? 'Não foi possível enviar. Confira o e-mail e tente novamente.'
        : 'Pronto! Enviamos um link para você criar uma nova senha. Confira também a caixa de spam.';
    } },
      h('p', { class: 'card-text', text: 'Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.' }),
      label('E-mail', email), msg,
      h('button', { class: 'btn', type: 'submit' }, 'Enviar link'),
      h('button', { class: 'btn link', type: 'button', onclick: () => { authTab = 'entrar'; rerender(); } }, 'Voltar para entrar'));
  }

  return h('div', { class: 'auth-wrap' }, h('div', { class: 'auth-card' },
    authBrand(),
    authTab === 'esqueci' ? h('h1', { class: 'auth-title', text: 'Recuperar senha' })
      : h('div', { class: 'auth-tabs' }, tab('entrar', 'Entrar'), tab('criar', 'Criar conta')),
    form,
    h('p', { class: 'auth-note', text: 'Seu planner fica salvo na sua conta: acesse do celular ou do computador, de onde estiver.' })));
}

function renderNewPassword() {
  const pass = passwordInput('Mínimo 6 caracteres', 'new-password');
  const msg = h('p', { class: 'form-msg', role: 'alert' });
  return h('div', { class: 'auth-wrap' }, h('div', { class: 'auth-card' },
    authBrand(),
    h('h1', { class: 'auth-title', text: 'Crie uma nova senha' }),
    h('form', { class: 'auth-form', onsubmit: async e => {
      e.preventDefault();
      if (pass.value.length < 6) { msg.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; return; }
      const err = await Store.updatePassword(pass.value);
      if (err) { msg.textContent = 'Não foi possível salvar. Peça um novo link e tente de novo.'; return; }
      recoveryMode = false;
      go('inicio');
      rerender();
    } },
      h('label', { class: 'field' }, h('span', { class: 'field-label', text: 'Nova senha' }), pass), msg,
      h('button', { class: 'btn', type: 'submit' }, 'Salvar nova senha'))));
}

/* ---------- status de sincronização ---------- */

const STATUS_TEXT = {
  local: 'Salvo neste aparelho',
  loggedout: 'Entre para sincronizar',
  pending: 'Salvando…',
  syncing: 'Sincronizando…',
  synced: 'Sincronizado',
  offline: 'Sem internet — salvo no aparelho',
  error: 'Erro ao sincronizar',
};

function renderStatus(s) {
  const el = document.getElementById('sync');
  el.className = 'sync ' + s;
  el.textContent = STATUS_TEXT[s] || '';
}

/* ---------- início ---------- */

document.getElementById('menu-btn').addEventListener('click', () => document.body.classList.toggle('menu-open'));
document.getElementById('scrim').addEventListener('click', () => document.body.classList.remove('menu-open'));
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
Store.onStatus(renderStatus);
Store.onRemote(rerender);
Store.onAuth(() => {
  if (Store.user && pendingNames && !S().fields.noivos) {
    S().fields.noivos = pendingNames;
    Store.save();
  }
  pendingNames = '';
  rerender();
});
Store.onRecovery(() => { recoveryMode = true; rerender(); });
renderStatus('local');
render();
Store.connect().then(rerender);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
