(() => {
  'use strict';

  const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
  const STALE_HOURS = 48;
  const $ = (sel) => document.querySelector(sel);

  const state = {
    models: new Map(),
    modelsDoc: null,
    tasksDoc: null,
    signals: null,
    changelog: null,
    catId: null,
    taskId: null,
    plan: 'paid',
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function loadJSON(path, bust) {
    const res = await fetch(`${path}?v=${encodeURIComponent(bust)}`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return res.json();
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(d);
  }

  function allTasks() {
    return state.tasksDoc.categories.flatMap((c) => c.tasks.map((t) => ({ ...t, cat: c })));
  }

  function findTask(id) {
    return allTasks().find((t) => t.id === id) || null;
  }

  // ---------- header ----------
  function renderUpdated() {
    const el = $('#updated');
    const iso = state.tasksDoc.updatedAt;
    const hours = (Date.now() - new Date(iso).getTime()) / 36e5;
    el.textContent = `마지막 갱신: ${fmtDate(iso)} (KST)`;
    if (hours > STALE_HOURS) {
      el.classList.add('stale');
      el.textContent += ' · 갱신이 늦어지고 있어요';
    }
  }

  // ---------- step 1 / 2 ----------
  function renderCategories() {
    $('#categories').innerHTML = state.tasksDoc.categories.map((c) => `
      <button type="button" class="cat" data-cat="${esc(c.id)}" aria-pressed="${c.id === state.catId}">
        <span class="ico" aria-hidden="true">${esc(c.icon)}</span>
        <strong>${esc(c.name)}</strong>
        <small>${esc(c.desc)}</small>
      </button>`).join('');
  }

  function renderTasks() {
    const cat = state.tasksDoc.categories.find((c) => c.id === state.catId);
    const step2 = $('#step2');
    if (!cat) { step2.hidden = true; return; }
    step2.hidden = false;
    $('#step2-title').innerHTML = `<span>2</span> ${esc(cat.icon)} ${esc(cat.name)} — 세부 업무`;
    $('#tasks').innerHTML = cat.tasks.map((t) => `
      <button type="button" class="chip" data-task="${esc(t.id)}" aria-pressed="${t.id === state.taskId}">${esc(t.name)}</button>`).join('');
  }

  // ---------- result ----------
  function meter(effort) {
    const idx = EFFORTS.indexOf(effort);
    const bars = EFFORTS.map((_, i) => `<i class="${i <= idx ? 'on' : ''}"></i>`).join('');
    const names = EFFORTS.map((e, i) => (i === idx ? `<b>${e}</b>` : `<span>${e}</span>`)).join('');
    return `<div class="meter" role="img" aria-label="노력 ${esc(effort)} (5단계 중 ${idx + 1})">${bars}</div><div class="meter-names">${names}</div>`;
  }

  function modelTag(model) {
    return model.access?.free ? '<span class="tag free">무료 사용 가능</span>' : `<span class="tag plan">${esc(model.access?.plan || '유료')}</span>`;
  }

  function verifyTag(model) {
    return model.verification === 'official'
      ? `<span class="tag free" title="공식 페이지를 직접 열어 확인">공식 페이지 확인 ${esc(model.lastVerified)}</span>`
      : `<span class="tag" title="원문을 직접 열지 못하고 웹 검색 결과 요약으로 확인">검색 요약 확인 ${esc(model.lastVerified)}</span>`;
  }

  function sourceLinks(sources) {
    if (!sources?.length) return '';
    return sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`).join(' · ');
  }

  function snsHtml(modelId) {
    const posts = (state.signals?.community || []).filter((c) => c.relatedModels?.includes(modelId)).slice(0, 3);
    if (!posts.length) return '';
    return `<div class="sub"><h3>SNS·커뮤니티 반응</h3>
      <ul class="plain">${posts.map((c) => `<li><span class="tag">${esc(c.platform)}</span>${esc(c.summary)} <a class="sources" href="${esc(c.url)}" target="_blank" rel="noopener">원문 ↗</a></li>`).join('')}</ul>
      <p class="sources">공개 계정의 개인 의견을 요약한 참고 자료이며, 추천은 공식 정보·벤치마크를 우선합니다.</p></div>`;
  }

  function renderResult() {
    const box = $('#result');
    const task = state.taskId && findTask(state.taskId);
    if (!task) { box.hidden = true; box.innerHTML = ''; return; }

    const pick = task.recommend[state.plan] || task.recommend.paid;
    const model = state.models.get(pick.model);
    if (!model) {
      box.hidden = false;
      box.innerHTML = `<div class="card error">추천 데이터에 알 수 없는 모델(${esc(pick.model)})이 있어요. 다음 갱신 때 수정됩니다.</div>`;
      return;
    }
    const guide = model.effortGuide?.[pick.effort];
    const other = state.plan === 'paid' ? task.recommend.free : task.recommend.paid;
    const alts = [...(task.alternatives || [])];
    if (other && other.model !== pick.model) alts.unshift({ ...other, label: state.plan === 'paid' ? '무료로 쓸 때' : '유료 구독이 있다면' });

    const altHtml = alts.map((a) => {
      const m = state.models.get(a.model);
      if (!m) return '';
      return `<div class="alt">
        <strong>${esc(m.name)}</strong>
        ${a.label ? `<span class="tag">${esc(a.label)}</span>` : ''}<span class="tag e-${esc(a.effort)}">노력 ${esc(a.effort)}</span>${modelTag(m)}
        <p>${esc(a.why)}</p>
      </div>`;
    }).join('');

    box.hidden = false;
    box.innerHTML = `
      <div class="card">
        <p class="eyebrow">${esc(task.cat.icon)} ${esc(task.cat.name)} › ${esc(task.name)} · ${state.plan === 'free' ? '무료 기준' : '유료 구독 기준'} 추천</p>
        <div class="result-head">
          <div>
            <h2 class="model-name">${esc(model.name)}</h2>
            <div class="vendor">${esc(model.vendor)} · ${esc(model.product)} ${modelTag(model)}</div>
          </div>
          <div class="effort">
            <div class="effort-label">추천 노력</div>
            <div class="effort-value">${esc(pick.effort)}</div>
            ${meter(pick.effort)}
          </div>
        </div>
        ${guide ? `<div class="howto"><b>이렇게 설정하세요</b>${esc(guide)}</div>` : ''}
        <p class="why">${esc(pick.why)}</p>
        <a class="cta" href="${esc(model.url)}" target="_blank" rel="noopener">${esc(model.product)} 열기 ↗</a>

        ${altHtml ? `<div class="sub"><h3>다른 선택지</h3><div class="alt-list">${altHtml}</div></div>` : ''}
        ${task.tips?.length ? `<div class="sub"><h3>잘 쓰는 요령</h3><ul class="plain">${task.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
        ${snsHtml(model.id)}
        ${task.cautions?.length ? `<div class="sub caution"><h3>주의</h3><ul class="plain">${task.cautions.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
        <p class="sub sources">${verifyTag(model)} 모델 정보 출처: ${sourceLinks(model.sources)}</p>
      </div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- panels ----------
  function renderModels() {
    const doc = state.modelsDoc;
    $('#models').innerHTML = doc.models.map((m) => `
      <div class="model">
        <h4>${esc(m.name)}</h4>
        <div>${esc(m.vendor)} · ${esc(m.product)} ${modelTag(m)}</div>
        <p>${esc(m.summary)}</p>
        ${m.released ? `<p>공개: ${esc(m.released)}</p>` : ''}
        <p class="sources">${verifyTag(m)} ${sourceLinks(m.sources)}</p>
      </div>`).join('');
  }

  function renderEffortHelp() {
    const levels = state.modelsDoc.effortLevels;
    $('#effort-help').innerHTML = `
      <p>“노력”은 AI가 답하기 전에 얼마나 오래·깊게 생각(추론)하게 할지를 뜻해요. 높을수록 정확해지는 경향이 있지만 느리고, 사용 한도를 더 빨리 씁니다. 서비스마다 이름이 달라서, 결과 화면의 <b>“이렇게 설정하세요”</b>에 각 서비스의 실제 메뉴 이름을 적어 두었어요.</p>
      <table class="effort-table">
        <thead><tr><th>단계</th><th>언제 쓰나요?</th></tr></thead>
        <tbody>${levels.map((l) => `<tr><td><span class="tag e-${esc(l.id)}">${esc(l.id)}</span></td><td>${esc(l.desc)}</td></tr>`).join('')}</tbody>
      </table>`;
  }

  function renderSignals() {
    const s = state.signals;
    if (!s) { $('#signals').innerHTML = '<p>아직 수집된 자료가 없어요.</p>'; return; }
    const bench = (s.benchmarks || []).map((b) => `
      <div class="signal">
        <h4><a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.name)}</a> <small>(${esc(b.checkedAt)} 확인)</small></h4>
        <div>${esc(b.summary)}</div>
      </div>`).join('');
    const comm = (s.community || []).map((c) => `
      <div class="signal">
        <h4>${c.platform ? `<span class="tag">${esc(c.platform)}</span>` : ''}<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.source)}</a> <small>(${esc(c.checkedAt)} 확인${c.evidence ? ` · ${esc(c.evidence)}` : ''})</small></h4>
        <div>${esc(c.summary)}</div>
      </div>`).join('');
    $('#signals').innerHTML = `
      <p>마지막 수집: ${esc(fmtDate(s.updatedAt))}</p>
      ${s.note ? `<p class="sources">${esc(s.note)}</p>` : ''}
      <h3>벤치마크</h3>${bench || '<p>없음</p>'}
      <h3>SNS·커뮤니티 후기 (X·Threads·Instagram·Facebook 등 공개 게시물)</h3>${comm || '<p>이번 갱신에서 확인된 신뢰할 만한 후기가 없어요.</p>'}`;
  }

  function renderGuidelines() {
    const list = state.tasksDoc.guidelines || [];
    $('#guidelines').innerHTML = list.length ? list.map((g) => `
      <div class="signal">
        <h4><a href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.title)}</a></h4>
        <div>${esc(g.summary)}</div>
      </div>`).join('') : '<p>등록된 지침이 없어요.</p>';
  }

  function renderChangelog() {
    const entries = state.changelog?.entries || [];
    $('#changelog').innerHTML = entries.length ? entries.slice(0, 30).map((e) => `
      <div class="log">
        <time>${esc(e.date)}</time> — ${esc(e.summary)}
        ${e.changes?.length ? `<ul class="plain">${e.changes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
      </div>`).join('') : '<p>기록 없음</p>';
  }

  // ---------- search ----------
  function scoreTask(task, terms) {
    const hay = [task.name, task.cat.name, ...(task.keywords || [])].map((s) => s.toLowerCase());
    let score = 0;
    for (const term of terms) {
      let best = 0;
      for (const h of hay) {
        if (h === term) best = Math.max(best, 5);
        else if (h.startsWith(term) || term.startsWith(h)) best = Math.max(best, 3);
        else if (h.includes(term) || term.includes(h)) best = Math.max(best, 2);
      }
      if (!best) return 0; // every term must match something
      score += best;
    }
    return score;
  }

  function renderSuggest(query) {
    const list = $('#suggest');
    const terms = query.toLowerCase().split(/[\s,]+/).filter(Boolean);
    if (!terms.length) { list.hidden = true; list.innerHTML = ''; return; }
    const hits = allTasks()
      .map((t) => ({ t, s: scoreTask(t, terms) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8);
    list.hidden = false;
    list.innerHTML = hits.length
      ? hits.map(({ t }) => `<li><button type="button" data-task="${esc(t.id)}"><span>${esc(t.name)}</span><small>${esc(t.cat.icon)} ${esc(t.cat.name)}</small></button></li>`).join('')
      : '<li class="empty">맞는 업무가 없어요. 아래 분류에서 골라 주세요.</li>';
  }

  // ---------- state / URL ----------
  function syncHash() {
    const p = new URLSearchParams();
    if (state.taskId) p.set('task', state.taskId);
    else if (state.catId) p.set('cat', state.catId);
    if (state.plan === 'free') p.set('plan', 'free');
    const h = p.toString();
    history.replaceState(null, '', h ? `#${h}` : location.pathname + location.search);
  }

  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    state.plan = p.get('plan') === 'free' ? 'free' : 'paid';
    const t = p.get('task') && findTask(p.get('task'));
    if (t) { state.taskId = t.id; state.catId = t.cat.id; } else {
      state.taskId = null;
      state.catId = state.tasksDoc.categories.some((c) => c.id === p.get('cat')) ? p.get('cat') : null;
    }
  }

  function renderPlan() {
    document.querySelectorAll('.plan-toggle button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.plan === state.plan)));
  }

  function renderAll() {
    renderPlan();
    renderCategories();
    renderTasks();
    renderResult();
  }

  function selectTask(id) {
    const t = findTask(id);
    if (!t) return;
    state.taskId = t.id;
    state.catId = t.cat.id;
    syncHash();
    renderAll();
  }

  function bind() {
    $('#categories').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      state.catId = b.dataset.cat;
      state.taskId = null;
      syncHash();
      renderAll();
      $('#step2').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    $('#tasks').addEventListener('click', (e) => {
      const b = e.target.closest('[data-task]');
      if (b) selectTask(b.dataset.task);
    });
    document.querySelector('.plan-toggle').addEventListener('click', (e) => {
      const b = e.target.closest('[data-plan]');
      if (!b) return;
      state.plan = b.dataset.plan;
      syncHash();
      renderPlan();
      if (state.taskId) renderResult();
    });
    const q = $('#q');
    q.addEventListener('input', () => renderSuggest(q.value.trim()));
    q.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const first = $('#suggest [data-task]');
        if (first) { first.click(); }
      } else if (e.key === 'Escape') { $('#suggest').hidden = true; }
    });
    $('#suggest').addEventListener('click', (e) => {
      const b = e.target.closest('[data-task]');
      if (!b) return;
      $('#suggest').hidden = true;
      q.value = '';
      selectTask(b.dataset.task);
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search')) $('#suggest').hidden = true;
    });
    document.querySelector('[data-reset]').addEventListener('click', (e) => {
      e.preventDefault();
      state.catId = null; state.taskId = null;
      syncHash(); renderAll();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    window.addEventListener('hashchange', () => { readHash(); renderAll(); });
  }

  async function init() {
    try {
      // Cache-bust on every load so a fresh update shows up without a hard refresh (files are small).
      const bust = Date.now();
      const [modelsDoc, tasksDoc, signals, changelog] = await Promise.all([
        loadJSON('data/models.json', bust),
        loadJSON('data/tasks.json', bust),
        loadJSON('data/signals.json', bust).catch(() => null),
        loadJSON('data/changelog.json', bust).catch(() => null),
      ]);
      state.modelsDoc = modelsDoc;
      state.tasksDoc = tasksDoc;
      state.signals = signals;
      state.changelog = changelog;
      modelsDoc.models.forEach((m) => state.models.set(m.id, m));
    } catch (err) {
      $('#updated').textContent = '데이터를 불러오지 못했어요';
      const hint = location.protocol === 'file:'
        ? '파일을 직접 열면 데이터를 읽을 수 없어요. 폴더에서 <code>python3 -m http.server</code>를 실행한 뒤 <code>http://localhost:8000</code>으로 열어 주세요.'
        : '배포된 사이트에 <code>data/</code> 폴더가 없거나 아직 반영 중일 수 있어요. 잠시 후 새로고침해 주세요.';
      document.querySelector('.search').hidden = true;
      document.querySelector('.plan-toggle').hidden = true;
      $('#categories').innerHTML = `<div class="card error"><p><b>추천 데이터를 불러오지 못했습니다.</b></p><p>${hint}</p><p class="sources">오류: ${esc(err.message)}</p><button type="button" class="chip" onclick="location.reload()">다시 시도</button></div>`;
      return;
    }
    renderUpdated();
    readHash();
    bind();
    renderAll();
    renderModels();
    renderEffortHelp();
    renderSignals();
    renderGuidelines();
    renderChangelog();
  }

  init();
})();
