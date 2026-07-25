// =====================================================================
// SUBCLEAN Academy — конфигурация подключения к Supabase.
// Вставьте сюда данные вашего проекта Supabase (Project Settings -> API):
//   SUPABASE_URL       -> "Project URL"
//   SUPABASE_ANON_KEY   -> "anon public" ключ
// Это НЕ секретные данные — они обязаны быть в коде страницы, доступ
// к данным ограничен функциями базы данных (см. supabase-schema.sql).
// =====================================================================
var SUPABASE_URL = 'https://zqqtzoakewgjsvveerso.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_iFd3Gh_IRLX6kWGzc-ZJnw_oQp2S_aB';

(function () {
  var SESSION_KEY = 'subclean-session-v1';
  var BUILTIN_ORDER = ['standards', 'process', 'surfaces', 'chemistry', 'rules'];
  var TEST_ID = 'test';
  var BUILTIN_LABELS = {
    standards: 'Стандарты сервиса', process: 'Как проходит уборка', surfaces: 'Поверхности и уход',
    chemistry: 'Химия и оборудование', rules: 'Регламенты компании', test: 'Тест на аттестацию'
  };

  function defaultTabsConfig() { return { order: BUILTIN_ORDER.slice(), hidden: [], custom: {} }; }
  var tabsConfig = defaultTabsConfig();
  function learningIds() { return tabsConfig.order.filter(function (id) { return tabsConfig.hidden.indexOf(id) === -1; }); }

  function normalizeTabsConfig(raw) {
    var cfg = defaultTabsConfig();
    if (raw && typeof raw === 'object') {
      if (raw.custom && typeof raw.custom === 'object') {
        Object.keys(raw.custom).forEach(function (id) { cfg.custom[id] = true; });
      }
      var order = [];
      var seen = {};
      if (Array.isArray(raw.order)) {
        raw.order.forEach(function (id) {
          if (id === TEST_ID || seen[id]) return;
          if (BUILTIN_ORDER.indexOf(id) === -1 && !cfg.custom[id]) return;
          seen[id] = true;
          order.push(id);
        });
      }
      BUILTIN_ORDER.forEach(function (id) { if (!seen[id]) { seen[id] = true; order.push(id); } });
      Object.keys(cfg.custom).forEach(function (id) { if (!seen[id]) { seen[id] = true; order.push(id); } });
      cfg.order = order;
      if (Array.isArray(raw.hidden)) cfg.hidden = raw.hidden.filter(function (id) { return id !== TEST_ID; });
    }
    return cfg;
  }

  function makeTabId() { return 'tab' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function panelTemplate(id) {
    var section = document.createElement('section');
    section.className = 'panel';
    section.id = 'panel-' + id;
    section.innerHTML =
      '<div class="panel-head">' +
        '<span class="eyebrow" data-mod-eyebrow="' + id + '">Модуль</span>' +
        '<h1 data-edit="' + id + '.title">Новый раздел</h1>' +
        '<p class="lede" data-edit="' + id + '.lede">Короткое описание раздела.</p>' +
      '</div>' +
      '<div class="module-content" data-edit="' + id + '.body"><p>Нажмите «Редактировать контент», чтобы заполнить этот раздел.</p></div>' +
      '<div class="module-foot" data-module="' + id + '">' +
        '<button type="button" class="btn study-btn">Материал изучен, далее →</button>' +
        '<span class="done-badge">Раздел изучен</span>' +
        '<button type="button" class="btn secondary next-btn">Следующий раздел →</button>' +
      '</div>';
    return section;
  }
  function navBtnTemplate(id) {
    var btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.dataset.tab = id;
    btn.dataset.custom = '1';
    btn.innerHTML = '<span class="n"></span><span class="nav-label" data-edit="nav.' + id + '">Новый раздел</span><span class="nav-state"></span>';
    return btn;
  }

  function renumberNav() {
    var i = 0;
    Array.prototype.forEach.call(document.getElementById('sidenav').children, function (btn) {
      if (btn.hidden) return;
      i++;
      var label = (i < 10 ? '0' : '') + i;
      var nEl = btn.querySelector('.n');
      if (nEl) nEl.textContent = label;
      var eyebrow = document.querySelector('.panel-head .eyebrow[data-mod-eyebrow="' + btn.dataset.tab + '"]');
      if (eyebrow) eyebrow.textContent = 'Модуль ' + label;
    });
  }

  function renderModules() {
    var mainCol = document.querySelector('.main-col');
    var sidenav = document.getElementById('sidenav');
    var testPanel = document.getElementById('panel-test');

    // create DOM for custom modules that don't exist yet
    Object.keys(tabsConfig.custom).forEach(function (id) {
      if (!document.getElementById('panel-' + id)) mainCol.insertBefore(panelTemplate(id), testPanel);
      if (!document.querySelector('.nav-btn[data-tab="' + id + '"]')) sidenav.appendChild(navBtnTemplate(id));
    });
    // drop DOM for custom modules that were removed from config
    Array.prototype.slice.call(document.querySelectorAll('.nav-btn[data-custom="1"]')).forEach(function (btn) {
      var id = btn.dataset.tab;
      if (!tabsConfig.custom[id]) {
        btn.remove();
        var p = document.getElementById('panel-' + id);
        if (p) p.remove();
      }
    });
    // hidden state (test is never hidden)
    tabsConfig.order.forEach(function (id) {
      var btn = document.querySelector('.nav-btn[data-tab="' + id + '"]');
      if (btn) btn.hidden = tabsConfig.hidden.indexOf(id) !== -1;
    });
    // reorder
    tabsConfig.order.forEach(function (id) {
      var btn = document.querySelector('.nav-btn[data-tab="' + id + '"]');
      if (btn) sidenav.appendChild(btn);
    });
    var testBtn = document.querySelector('.nav-btn[data-tab="' + TEST_ID + '"]');
    if (testBtn) sidenav.appendChild(testBtn);
    // wire "next" for module-foot buttons
    var lrn = learningIds();
    lrn.forEach(function (id, i) {
      var foot = document.querySelector('.module-foot[data-module="' + id + '"]');
      if (!foot) return;
      foot.dataset.next = (i + 1 < lrn.length) ? lrn[i + 1] : TEST_ID;
      foot.classList.toggle('is-last', i === lrn.length - 1);
    });
    renumberNav();
  }

  var configured = SUPABASE_URL.indexOf('ВСТАВЬТЕ') === -1 && SUPABASE_ANON_KEY.indexOf('ВСТАВЬТЕ') === -1;
  var supabase = configured && window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  function showConfigWarning() {
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;z-index:999;background:#941E33;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;font-family:sans-serif;text-align:center;';
    box.innerHTML = '<div style="max-width:520px"><h1 style="font-size:1.3rem;margin-bottom:12px;">Сайт не подключён к базе данных</h1><p style="opacity:.9;line-height:1.5">Откройте файл <code>app.js</code> и вставьте SUPABASE_URL и SUPABASE_ANON_KEY из вашего проекта Supabase. Инструкция — в файле DEPLOY.md.</p></div>';
    document.body.appendChild(box);
  }
  if (!configured) { document.addEventListener('DOMContentLoaded', showConfigWarning); return; }

  // ---------- session ----------
  var session = null;
  try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { session = null; }
  function saveSession(s) { session = s; localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
  function clearSession() { session = null; localStorage.removeItem(SESSION_KEY); }

  // ---------- elements ----------
  var gateEl = document.getElementById('login-gate');
  var appEl = document.getElementById('app');
  var loginForm = document.getElementById('login-form');
  var loginError = document.getElementById('login-error');
  var logoutBtn = document.getElementById('logout-btn');
  var pwInput = document.getElementById('login-pass');
  var pwToggle = document.getElementById('pw-toggle');
  var adminBar = document.getElementById('admin-bar');
  var openUsersBtn = document.getElementById('open-users');
  var loginSubmitBtn = loginForm.querySelector('button[type="submit"]');

  pwToggle.addEventListener('click', function () {
    var isHidden = pwInput.type === 'password';
    pwInput.type = isHidden ? 'text' : 'password';
    pwToggle.textContent = isHidden ? 'Скрыть' : 'Показать';
    pwToggle.setAttribute('aria-label', isHidden ? 'Скрыть пароль' : 'Показать пароль');
  });

  function showGate() {
    appEl.hidden = true;
    gateEl.hidden = false;
    adminBar.hidden = true;
    openUsersBtn.hidden = true;
    exitEdit(true);
  }

  async function showApp() {
    gateEl.hidden = true;
    appEl.hidden = false;
    var isAdmin = session.role === 'admin';
    adminBar.hidden = !isAdmin;
    openUsersBtn.hidden = !isAdmin;
    await loadContent();
    await loadProgress();
    buildQuiz();
    refreshNav();
    var activeBtn = document.querySelector('.nav-btn.active');
    if (!activeBtn || activeBtn.hidden) switchTo(learningIds()[0] || TEST_ID);
  }

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var user = document.getElementById('login-user').value.trim();
    var pass = document.getElementById('login-pass').value;
    loginError.classList.remove('show');
    loginSubmitBtn.disabled = true;
    loginSubmitBtn.textContent = 'Входим…';
    try {
      var res = await supabase.rpc('app_login', { p_login: user, p_password: pass });
      if (res.error || !res.data || !res.data.length) throw new Error('invalid');
      var row = res.data[0];
      saveSession({ token: row.token, role: row.role, login: row.login });
      await showApp();
    } catch (err) {
      loginError.classList.add('show');
    } finally {
      loginSubmitBtn.disabled = false;
      loginSubmitBtn.textContent = 'Войти';
    }
  });

  logoutBtn.addEventListener('click', async function () {
    if (session) { try { await supabase.rpc('app_logout', { p_token: session.token }); } catch (e) {} }
    clearSession();
    loginForm.reset();
    showGate();
  });

  // ---------- content (module text overrides + quiz) ----------
  var editEls = [];
  var DEFAULTS = {};
  function captureDefaults() {
    editEls = Array.prototype.slice.call(document.querySelectorAll('[data-edit]'));
    editEls.forEach(function (el) {
      var key = el.getAttribute('data-edit');
      if (!(key in DEFAULTS)) DEFAULTS[key] = el.innerHTML;
    });
  }
  captureDefaults();
  var overrides = { edits: {}, quiz: null };

  function applyContent() {
    editEls.forEach(function (el) {
      var key = el.getAttribute('data-edit');
      el.innerHTML = (overrides.edits && overrides.edits[key] != null) ? overrides.edits[key] : DEFAULTS[key];
    });
  }

  async function loadContent() {
    try {
      var res = await supabase.rpc('get_content');
      if (!res.error && res.data && res.data.length) {
        overrides.edits = res.data[0].edits || {};
        overrides.quiz = res.data[0].quiz || null;
      }
    } catch (e) {}
    tabsConfig = normalizeTabsConfig(overrides.edits.__tabs);
    renderModules();
    captureDefaults();
    applyContent();
  }

  async function persistContent() {
    if (!session || session.role !== 'admin') return;
    await supabase.rpc('save_content', { p_token: session.token, p_edits: overrides.edits, p_quiz: overrides.quiz });
  }

  function currentQuestions() { return (overrides.quiz && overrides.quiz.length) ? overrides.quiz : DEFAULT_QUESTIONS; }

  var DEFAULT_QUESTIONS = [
    { topic: 'Стандарты', q: 'За что в первую очередь платит клиент SUBCLEAN?', options: ['За спокойствие, безопасность, конфиденциальность и дисциплину', 'За максимально быструю уборку', 'За самую низкую цену на рынке'], correct: 0, explain: 'Клиент платит не только за чистоту, но и за дисциплину, безопасность и профессиональный подход.' },
    { topic: 'Стандарты', q: 'С какими объектами работает SUBCLEAN?', options: ['Только с жилыми элитными квартирами', 'С офисами и коммерцией', 'С загородными домами и офисами'], correct: 0, explain: 'Мы принципиально убираем только жилые квартиры — это позволяет глубже разбираться в материалах и уходе.' },
    { topic: 'Стандарты', q: 'Что означает гарантия результата SUBCLEAN?', options: ['Недочёты после уборки исправляем бесплатно', 'Клиент доплачивает за переделку', 'Переделок не бывает никогда'], correct: 0, explain: 'Если клиент заметит недочёт — мы бесплатно его исправим. Поэтому качество сдачи важно для всей команды.' },
    { topic: 'Правила', q: 'Сколько поверхностей можно протирать одной микрофиброй?', options: ['Одна микрофибра — одна поверхность', 'Одна микрофибра на всю комнату', 'Пока салфетка визуально не испачкается'], correct: 0, explain: 'Действует принцип «1 микрофибра = 1 поверхность». Цветовую маркировку мы не используем.' },
    { topic: 'Химия', q: 'С какого средства начинают работу с загрязнением?', options: ['С самого мягкого, нейтрального pH', 'Сразу с самого активного', 'С кислотного — оно быстрее'], correct: 0, explain: 'Всегда начинаем с нейтрального pH и только при необходимости переходим к более активной химии.' },
    { topic: 'Материалы', q: 'Чем нельзя обрабатывать мрамор и натуральный камень?', options: ['Кислотными средствами', 'Нейтральным средством', 'Мягкой микрофиброй'], correct: 0, explain: 'Кислота вызывает необратимый химический «ожог» пористого камня.' },
    { topic: 'Оборудование', q: 'Как наносится активная щёлочь или кислота?', options: ['На новую микрофибру через флакон-пенообразователь, локально', 'Обычным триггером на всю поверхность', 'Абразивной губкой'], correct: 0, explain: 'Работаем только локально, в зоне загрязнения — это исключает попадание химии туда, где она не нужна.' },
    { topic: 'Правила', q: 'Что можно делать с телефоном на объекте?', options: ['Ничего — телефон не используется, фото/видео запрещены', 'Слушать музыку в наушниках', 'Отвечать на личные звонки'], correct: 0, explain: 'На объекте запрещены телефон, музыка и фото-/видеосъёмка. Полная концентрация на работе.' },
    { topic: 'Конфиденциальность', q: 'Можно ли фотографировать квартиру и вещи клиента?', options: ['Нет, NDA запрещает любые фото и видео', 'Да, для внутреннего отчёта', 'Да, если в кадре нет клиента'], correct: 0, explain: 'Все клинеры подписывают NDA. Всё, что вы видите на объекте, остаётся на объекте.' },
    { topic: 'Химия', q: 'Что делаем перед первым применением средства на новой поверхности?', options: ['Клин-тест на незаметном участке', 'Сразу наносим на всю площадь', 'Спрашиваем разрешение у клиента'], correct: 0, explain: 'Только убедившись в безопасности на незаметном участке, применяем средство на всей площади.' },
    { topic: 'Химия', q: 'Можно ли смешивать разные химические средства?', options: ['Нет, никогда', 'Да, чтобы усилить эффект', 'Только кислоту с щёлочью'], correct: 0, explain: 'Средства не смешиваем никогда. Смесь кислоты с хлором/аммиаком выделяет токсичный газ.' },
    { topic: 'Химия', q: 'Профессиональная химия — концентрат. Если налить средства больше нормы:', options: ['Будут разводы и липкость, поверхность может пострадать', 'Всегда будет чище', 'Уборка пойдёт быстрее'], correct: 0, explain: 'Больше ≠ чище. Разводим строго по норме на этикетке (обычно на 10 л воды), используя дозаторы.' },
    { topic: 'Процесс', q: 'За сколько часов до уборки нужно подтвердить участие?', options: ['Не позднее чем за 2 часа', 'За 30 минут', 'В день уборки, когда удобно'], correct: 0, explain: 'Без подтверждения за 2 часа клинер может быть снят с заказа.' },
    { topic: 'Процесс', q: 'Кто первым входит в квартиру и общается с клиентом?', options: ['Персональный менеджер', 'Старший клинер', 'Любой клинер команды'], correct: 0, explain: 'Менеджер входит первым и представляет команду. Дальше всё общение с клиентом — только через него.' },
    { topic: 'Процесс', q: 'Через сколько дней после уборки контроль качества звонит клиенту?', options: ['Через 2 дня', 'Сразу в день уборки', 'Через неделю'], correct: 0, explain: 'За уборку без замечаний по итогам этого звонка команда получает дополнительную премию.' },
    { topic: 'Нарушения', q: 'Что делать, если клинер повредил поверхность?', options: ['Немедленно сообщить менеджеру', 'Скрыть и попытаться исправить самому', 'Сообщить в конце смены'], correct: 0, explain: 'Сокрытие повреждения ведёт к прекращению сотрудничества. Если сразу сообщил — ситуация решается индивидуально.' },
    { topic: 'Материалы', q: 'Чем по умолчанию чистят латунь и золочёную фурнитуру?', options: ['Сухой мягкой тканью, без химии', 'Кислотным средством', 'Абразивной губкой'], correct: 0, explain: 'Тонкое декоративное покрытие стирается абразивом и разъедается кислотой. Спецсредство — по согласованию.' },
    { topic: 'Правила', q: 'Куда можно ставить химию и инвентарь на объекте?', options: ['На переносной стол или силиконовые коврики', 'Прямо на пол клиента', 'На подоконник или столешницу'], correct: 0, explain: 'На поверхности клиента ничего не ставим — только переносной стол или силиконовые коврики.' },
    { topic: 'Материалы', q: 'Как ухаживают за паркетом и массивом дерева?', options: ['Сухая/полусухая уборка, не заливать водой, без пара', 'Мыть большим количеством горячей воды', 'Обрабатывать паром для дезинфекции'], correct: 0, explain: 'Избыток влаги и пар ведут к вздутию и деформации доски.' },
    { topic: 'Нарушения', q: 'При скольких поинтах клинера отстраняют и направляют на переаттестацию?', options: ['При 5 поинтах', 'При 3 поинтах', 'При 10 поинтах'], correct: 0, explain: 'За каждое нарушение — 1 поинт. 5 поинтов — отстранение и переаттестация. Обнуляются каждые полгода.' }
  ];

  // ---------- progress / unlocking ----------
  var completed = {};
  async function loadProgress() {
    completed = {};
    try {
      var res = await supabase.rpc('get_progress', { p_token: session.token });
      if (!res.error && Array.isArray(res.data)) res.data.forEach(function (t) { completed[t] = true; });
    } catch (e) {}
  }
  async function persistProgress() {
    if (!session) return;
    await supabase.rpc('save_progress', { p_token: session.token, p_completed: Object.keys(completed) });
  }

  function isUnlocked(tab) {
    var lrn = learningIds();
    if (tab === lrn[0]) return true;
    var idx = lrn.indexOf(tab);
    if (idx > 0) return !!completed[lrn[idx - 1]];
    if (tab === TEST_ID) return lrn.every(function (m) { return completed[m]; });
    return true;
  }
  function completedCount() { return learningIds().filter(function (m) { return completed[m]; }).length; }

  function refreshNav() {
    var lrn = learningIds();
    Array.prototype.forEach.call(document.querySelectorAll('.nav-btn'), function (btn) {
      var tab = btn.dataset.tab;
      var state = btn.querySelector('.nav-state');
      btn.classList.remove('done', 'locked');
      if (completed[tab]) { btn.classList.add('done'); if (state) state.textContent = '✓'; }
      else if (!isUnlocked(tab)) { btn.classList.add('locked'); if (state) state.textContent = '🔒'; }
      else { if (state) state.textContent = ''; }
    });
    lrn.forEach(function (m) {
      var foot = document.querySelector('.module-foot[data-module="' + m + '"]');
      if (foot) foot.classList.toggle('is-done', !!completed[m]);
    });
    var done = completedCount();
    document.getElementById('rp-count').textContent = done + ' / ' + lrn.length;
    document.getElementById('rp-fill').style.width = (lrn.length ? Math.round((done / lrn.length) * 100) : 0) + '%';
  }

  function switchTo(tab) {
    if (!isUnlocked(tab)) return false;
    Array.prototype.forEach.call(document.querySelectorAll('.nav-btn'), function (b) { b.classList.remove('active'); });
    Array.prototype.forEach.call(document.querySelectorAll('section.panel'), function (p) { p.classList.remove('active'); });
    var btn = document.querySelector('.nav-btn[data-tab="' + tab + '"]');
    if (btn) btn.classList.add('active');
    var panel = document.getElementById('panel-' + tab);
    if (panel) panel.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  }

  var editing = false;
  document.getElementById('sidenav').addEventListener('click', function (e) {
    var btn = e.target.closest('.nav-btn');
    if (btn && !editing) switchTo(btn.dataset.tab);
  });

  document.querySelector('.main-col').addEventListener('click', async function (e) {
    var studyBtn = e.target.closest('.study-btn');
    var nextBtn = e.target.closest('.next-btn');
    if (studyBtn) {
      var foot = studyBtn.closest('.module-foot');
      if (!foot) return;
      completed[foot.dataset.module] = true;
      await persistProgress();
      refreshNav();
      if (foot.dataset.next) switchTo(foot.dataset.next);
    } else if (nextBtn) {
      var foot2 = nextBtn.closest('.module-foot');
      if (foot2 && foot2.dataset.next) switchTo(foot2.dataset.next);
    }
  });

  // ---------- admin: inline editing ----------
  var abToggle = document.getElementById('ab-toggle');
  var abSave = document.getElementById('ab-save');
  var abCancel = document.getElementById('ab-cancel');
  var abHint = document.getElementById('ab-hint');
  var snapshot = {};

  function flashHint(text) {
    abHint.textContent = text;
    setTimeout(function () { if (!editing) abHint.textContent = 'Режим просмотра'; }, 2500);
  }

  function enterEdit() {
    editing = true;
    snapshot = {};
    editEls.forEach(function (el) {
      snapshot[el.getAttribute('data-edit')] = el.innerHTML;
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'false');
    });
    document.body.classList.add('editing');
    abToggle.hidden = true; abSave.hidden = false; abCancel.hidden = false;
    abHint.textContent = 'Редактирование: кликните по любому тексту';
    abHint.classList.add('editing');
  }
  function exitEdit(silent) {
    if (!editing && silent) { document.body.classList.remove('editing'); return; }
    editing = false;
    editEls.forEach(function (el) { el.removeAttribute('contenteditable'); el.removeAttribute('spellcheck'); });
    document.body.classList.remove('editing');
    abToggle.hidden = false; abSave.hidden = true; abCancel.hidden = true;
    abHint.textContent = 'Режим просмотра';
    abHint.classList.remove('editing');
  }
  abToggle.addEventListener('click', enterEdit);
  abSave.addEventListener('click', async function () {
    editEls.forEach(function (el) {
      var key = el.getAttribute('data-edit');
      var html = el.innerHTML;
      if (html === DEFAULTS[key]) delete overrides.edits[key];
      else overrides.edits[key] = html;
    });
    abSave.disabled = true;
    try { await persistContent(); flashHint('Изменения сохранены'); }
    catch (e) { flashHint('Не удалось сохранить — проверьте связь'); }
    abSave.disabled = false;
    exitEdit();
  });
  abCancel.addEventListener('click', function () {
    editEls.forEach(function (el) { el.innerHTML = snapshot[el.getAttribute('data-edit')]; });
    exitEdit();
  });

  document.getElementById('ab-reset').addEventListener('click', async function () {
    if (!window.confirm('Сбросить весь контент и тест к исходному для ВСЕХ пользователей? Действие необратимо.')) return;
    overrides = { edits: {}, quiz: null };
    await persistContent();
    applyContent();
    buildQuiz();
    flashHint('Контент сброшен к исходному');
  });


  // ---------- quiz ----------
  var PASS = 0.8;
  var quizForm = document.getElementById('quiz-form');
  var checkBtn = document.getElementById('quiz-check');
  var resetBtn = document.getElementById('quiz-reset');
  var hintEl = document.getElementById('quiz-hint');
  var resultEl = document.getElementById('quiz-result');
  var qTotalEl = document.getElementById('q-total');

  function buildQuiz() {
    var questions = currentQuestions();
    qTotalEl.textContent = questions.length;
    quizForm.innerHTML = '';
    quizForm.classList.remove('quiz-graded');
    resultEl.classList.remove('show', 'pass');
    checkBtn.style.display = '';
    resetBtn.style.display = 'none';
    hintEl.textContent = '';
    questions.forEach(function (item, qi) {
      var card = document.createElement('div');
      card.className = 'q-card'; card.id = 'qc-' + qi;
      var head = document.createElement('div'); head.className = 'q-head';
      var num = document.createElement('span'); num.className = 'q-num'; num.textContent = (qi + 1);
      var text = document.createElement('span'); text.className = 'q-text'; text.textContent = item.q;
      var topic = document.createElement('span'); topic.className = 'q-topic'; topic.textContent = item.topic || '';
      head.appendChild(num); head.appendChild(text); head.appendChild(topic); card.appendChild(head);
      var opts = document.createElement('div'); opts.className = 'options';
      (item.options || []).forEach(function (optText, oi) {
        var label = document.createElement('label'); label.className = 'opt';
        label.setAttribute('data-qi', qi); label.setAttribute('data-oi', oi);
        var input = document.createElement('input'); input.type = 'radio'; input.name = 'q' + qi; input.value = oi;
        var span = document.createElement('span'); span.textContent = optText;
        var mark = document.createElement('span'); mark.className = 'mark';
        label.appendChild(input); label.appendChild(span); label.appendChild(mark);
        opts.appendChild(label);
      });
      card.appendChild(opts);
      var explain = document.createElement('div'); explain.className = 'q-explain'; explain.textContent = item.explain || '';
      card.appendChild(explain);
      quizForm.appendChild(card);
    });
  }

  function gradeQuiz() {
    var questions = currentQuestions();
    var answered = 0, correct = 0;
    questions.forEach(function (item, qi) {
      var chosen = quizForm.querySelector('input[name="q' + qi + '"]:checked');
      var labels = quizForm.querySelectorAll('.opt[data-qi="' + qi + '"]');
      var card = document.getElementById('qc-' + qi);
      card.classList.remove('wrong');
      if (chosen) { answered++; if (parseInt(chosen.value, 10) === item.correct) correct++; else card.classList.add('wrong'); }
      else card.classList.add('wrong');
      labels.forEach(function (lab) {
        var oi = parseInt(lab.getAttribute('data-oi'), 10);
        lab.classList.remove('correct', 'incorrect');
        var mark = lab.querySelector('.mark');
        if (oi === item.correct) { lab.classList.add('correct'); mark.textContent = 'Верно'; }
        else if (chosen && oi === parseInt(chosen.value, 10)) { lab.classList.add('incorrect'); mark.textContent = 'Неверно'; }
        else mark.textContent = '';
      });
    });
    return { answered: answered, correct: correct, total: questions.length };
  }

  var RING_C = 2 * Math.PI * 37;
  function showResult(res) {
    var ratio = res.total ? res.correct / res.total : 0;
    var pct = Math.round(ratio * 100);
    var passed = ratio >= PASS;
    var fill = document.getElementById('score-ring-fill');
    fill.style.strokeDasharray = RING_C;
    fill.style.strokeDashoffset = RING_C * (1 - ratio);
    document.getElementById('score-pct').textContent = pct + '%';
    document.getElementById('score-title').textContent = passed ? 'Аттестация пройдена' : 'Нужно повторить материал';
    document.getElementById('score-sub').textContent = 'Правильных ответов: ' + res.correct + ' из ' + res.total +
      (passed ? '. Отличный результат — вы готовы к первому заказу.' : '. Порог — 80%. Вернитесь к модулям и попробуйте снова.');
    resultEl.classList.toggle('pass', passed);
    resultEl.classList.add('show');
  }

  checkBtn.addEventListener('click', function () {
    var res = gradeQuiz();
    hintEl.textContent = res.answered < res.total ? ('Отвечено ' + res.answered + ' из ' + res.total + ' — пропущенные отмечены красным.') : '';
    quizForm.classList.add('quiz-graded');
    showResult(res);
    checkBtn.style.display = 'none';
    resetBtn.style.display = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  resetBtn.addEventListener('click', function () { buildQuiz(); window.scrollTo({ top: 0, behavior: 'smooth' }); });

  // ---------- quiz editor modal ----------
  var quizModal = document.getElementById('quiz-modal');
  var qeList = document.getElementById('quiz-editor-list');
  var working = [];

  function cloneQuestions(src) {
    return src.map(function (q) {
      return { topic: q.topic || '', q: q.q || '', options: (q.options || []).slice(), correct: typeof q.correct === 'number' ? q.correct : 0, explain: q.explain || '' };
    });
  }
  function field(labelText, type, value, onInput) {
    var f = document.createElement('div'); f.className = 'qe-field';
    var l = document.createElement('label'); l.textContent = labelText; f.appendChild(l);
    var input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
    input.className = type === 'textarea' ? 'qe-textarea' : 'qe-input';
    if (type !== 'textarea') input.type = 'text';
    input.value = value || '';
    input.addEventListener('input', function () { onInput(input.value); });
    f.appendChild(input);
    return f;
  }
  function optionRow(item, qi, oi) {
    var row = document.createElement('div'); row.className = 'qe-opt';
    var radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'qe-correct-' + qi;
    radio.checked = (item.correct === oi);
    radio.addEventListener('change', function () { item.correct = oi; });
    var input = document.createElement('input'); input.type = 'text'; input.className = 'qe-input'; input.value = item.options[oi] || '';
    input.addEventListener('input', function () { item.options[oi] = input.value; });
    var del = document.createElement('button'); del.type = 'button'; del.className = 'qe-opt-del'; del.textContent = '✕'; del.setAttribute('aria-label', 'Удалить вариант');
    del.addEventListener('click', function () { item.options.splice(oi, 1); if (item.correct >= item.options.length) item.correct = 0; renderEditor(); });
    row.appendChild(radio); row.appendChild(input); row.appendChild(del);
    return row;
  }
  function renderEditor() {
    qeList.innerHTML = '';
    working.forEach(function (item, qi) {
      var wrap = document.createElement('div'); wrap.className = 'qe-item';
      var top = document.createElement('div'); top.className = 'qe-top';
      var idx = document.createElement('span'); idx.className = 'qe-idx'; idx.textContent = 'Вопрос ' + (qi + 1);
      var del = document.createElement('button'); del.type = 'button'; del.className = 'qe-del'; del.textContent = 'Удалить';
      del.addEventListener('click', function () { working.splice(qi, 1); renderEditor(); });
      top.appendChild(idx); top.appendChild(del); wrap.appendChild(top);
      wrap.appendChild(field('Тема', 'input', item.topic, function (v) { item.topic = v; }));
      wrap.appendChild(field('Вопрос', 'textarea', item.q, function (v) { item.q = v; }));
      var optsField = document.createElement('div'); optsField.className = 'qe-field';
      var lbl = document.createElement('label'); lbl.textContent = 'Варианты ответов'; optsField.appendChild(lbl);
      var hint = document.createElement('div'); hint.className = 'qe-correct-hint'; hint.textContent = 'Отметьте точкой правильный ответ'; optsField.appendChild(hint);
      var optsBox = document.createElement('div'); optsBox.className = 'qe-opts';
      item.options.forEach(function (optText, oi) { optsBox.appendChild(optionRow(item, qi, oi)); });
      optsField.appendChild(optsBox);
      var addOpt = document.createElement('button'); addOpt.type = 'button'; addOpt.className = 'qe-addopt'; addOpt.textContent = '+ вариант';
      addOpt.addEventListener('click', function () { item.options.push(''); renderEditor(); });
      optsField.appendChild(addOpt);
      wrap.appendChild(optsField);
      wrap.appendChild(field('Пояснение', 'textarea', item.explain, function (v) { item.explain = v; }));
      qeList.appendChild(wrap);
    });
  }
  function openEditor() { working = cloneQuestions(currentQuestions()); renderEditor(); quizModal.hidden = false; }
  function closeEditor() { quizModal.hidden = true; }

  document.getElementById('ab-quiz').addEventListener('click', openEditor);
  document.getElementById('quiz-modal-close').addEventListener('click', closeEditor);
  document.getElementById('quiz-editor-cancel').addEventListener('click', closeEditor);
  document.getElementById('quiz-add').addEventListener('click', function () { working.push({ topic: '', q: '', options: ['', ''], correct: 0, explain: '' }); renderEditor(); qeList.scrollTop = qeList.scrollHeight; });
  quizModal.addEventListener('click', function (e) { if (e.target === quizModal) closeEditor(); });

  document.getElementById('quiz-editor-save').addEventListener('click', async function () {
    var cleaned = [];
    for (var i = 0; i < working.length; i++) {
      var w = working[i];
      var opts = w.options.map(function (o) { return (o || '').trim(); }).filter(function (o) { return o.length; });
      if (!w.q.trim() || opts.length < 2) { window.alert('Вопрос ' + (i + 1) + ': нужен текст вопроса и минимум 2 варианта.'); return; }
      var correctText = (w.options[w.correct] || '').trim();
      var ci = opts.indexOf(correctText);
      cleaned.push({ topic: w.topic.trim(), q: w.q.trim(), options: opts, correct: ci >= 0 ? ci : 0, explain: w.explain.trim() });
    }
    if (!cleaned.length) { window.alert('Добавьте хотя бы один вопрос.'); return; }
    overrides.quiz = cleaned;
    try { await persistContent(); buildQuiz(); closeEditor(); flashHint('Тест обновлён'); }
    catch (e) { window.alert('Не удалось сохранить тест — проверьте связь.'); }
  });

  // ---------- users manager ----------
  var usersModal = document.getElementById('users-modal');
  var usersList = document.getElementById('users-list');
  var uWorking = [];

  function learnDone(completed) {
    if (!Array.isArray(completed)) return 0;
    return learningIds().filter(function (m) { return completed.indexOf(m) >= 0; }).length;
  }

  async function openUsers() {
    usersList.innerHTML = '<p style="color:var(--ink-soft);font-size:0.9rem">Загрузка…</p>';
    usersModal.hidden = false;
    try {
      var res = await supabase.rpc('list_users', { p_token: session.token });
      if (res.error) throw res.error;
      uWorking = res.data.map(function (u) {
        return { login: u.login, pass: u.password || '', role: u.role, orig: u.login, completed: u.completed || [] };
      });
    } catch (e) {
      uWorking = [];
    }
    renderUsers();
  }
  function closeUsers() { usersModal.hidden = true; }

  function renderUsers() {
    usersList.innerHTML = '';
    if (!uWorking.length) {
      var empty = document.createElement('p'); empty.style.cssText = 'color:var(--ink-soft);font-size:0.9rem';
      empty.textContent = 'Список пуст или не удалось загрузить. Добавьте сотрудника.';
      usersList.appendChild(empty);
    }
    uWorking.forEach(function (u, i) {
      var isSelf = u.orig && session && u.orig === session.login;
      var row = document.createElement('div'); row.className = 'user-row';

      // header: title + progress + delete
      var head = document.createElement('div'); head.className = 'u-head';
      var title = document.createElement('span'); title.className = 'u-title';
      title.textContent = u.orig ? u.orig : 'Новый сотрудник';
      if (isSelf) { var you = document.createElement('span'); you.className = 'u-you'; you.textContent = 'вы'; title.appendChild(you); }
      head.appendChild(title);

      if (u.orig) {
        var prog = document.createElement('span'); prog.className = 'u-progress';
        if (u.role === 'admin') {
          prog.textContent = 'администратор';
        } else {
          var done = learnDone(u.completed);
          var lrnTotal = learningIds().length;
          prog.innerHTML = 'Обучение: <b>' + done + ' / ' + lrnTotal + '</b>' + (done === lrnTotal ? ' · тест доступен' : '');
        }
        head.appendChild(prog);
      }

      var del = document.createElement('button'); del.type = 'button'; del.className = 'u-del'; del.textContent = 'Удалить';
      if (isSelf) { del.disabled = true; del.title = 'Нельзя удалить свою учётную запись'; }
      del.addEventListener('click', async function () {
        if (u.orig) {
          if (!window.confirm('Удалить пользователя «' + u.orig + '»?')) return;
          try {
            var dr = await supabase.rpc('delete_user', { p_token: session.token, p_login: u.orig });
            if (dr.error) throw dr.error;
          } catch (e) { window.alert('Не удалось удалить: ' + (e.message || e)); return; }
        }
        uWorking.splice(i, 1);
        renderUsers();
      });
      head.appendChild(del);
      row.appendChild(head);

      // fields: login, password, role
      var fields = document.createElement('div'); fields.className = 'u-fields';

      var f1 = document.createElement('div'); f1.className = 'uf';
      var l1 = document.createElement('label'); l1.textContent = 'Логин';
      var i1 = document.createElement('input'); i1.type = 'text'; i1.className = 'u-input'; i1.value = u.login; i1.autocapitalize = 'off'; i1.autocomplete = 'off';
      i1.addEventListener('input', function () { u.login = i1.value; });
      f1.appendChild(l1); f1.appendChild(i1);

      var f2 = document.createElement('div'); f2.className = 'uf';
      var l2 = document.createElement('label'); l2.textContent = 'Пароль';
      var i2 = document.createElement('input'); i2.type = 'text'; i2.className = 'u-input'; i2.value = u.pass; i2.autocapitalize = 'off'; i2.autocomplete = 'off';
      if (u.orig && !u.pass) i2.placeholder = 'задайте новый пароль';
      i2.addEventListener('input', function () { u.pass = i2.value; });
      f2.appendChild(l2); f2.appendChild(i2);

      var f3 = document.createElement('div'); f3.className = 'uf';
      var l3 = document.createElement('label'); l3.textContent = 'Роль';
      var sel = document.createElement('select'); sel.className = 'u-select';
      [['viewer', 'Клинер'], ['admin', 'Администратор']].forEach(function (pair) {
        var o = document.createElement('option'); o.value = pair[0]; o.textContent = pair[1];
        if (u.role === pair[0]) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () { u.role = sel.value; });
      f3.appendChild(l3); f3.appendChild(sel);

      fields.appendChild(f1); fields.appendChild(f2); fields.appendChild(f3);
      row.appendChild(fields);
      usersList.appendChild(row);
    });
  }

  openUsersBtn.addEventListener('click', openUsers);
  document.getElementById('users-modal-close').addEventListener('click', closeUsers);
  document.getElementById('users-cancel').addEventListener('click', closeUsers);
  usersModal.addEventListener('click', function (e) { if (e.target === usersModal) closeUsers(); });
  document.getElementById('users-add').addEventListener('click', function () {
    uWorking.push({ login: '', pass: '', role: 'viewer', orig: null });
    renderUsers();
    usersList.scrollTop = usersList.scrollHeight;
  });

  document.getElementById('users-save').addEventListener('click', async function () {
    var seen = {}; var admins = uWorking.filter(function (u) { return u.role === 'admin'; }).length;
    for (var i = 0; i < uWorking.length; i++) {
      var u = uWorking[i];
      var login = (u.login || '').trim();
      if (!login) { window.alert('Строка ' + (i + 1) + ': логин не должен быть пустым.'); return; }
      if (!u.orig && !(u.pass || '').trim()) { window.alert('Строка ' + (i + 1) + ': укажите пароль для нового сотрудника.'); return; }
      if (seen[login.toLowerCase()]) { window.alert('Логин «' + login + '» повторяется — логины должны быть уникальными.'); return; }
      seen[login.toLowerCase()] = true;
    }
    if (admins < 1) { window.alert('Должен остаться хотя бы один администратор.'); return; }

    var saveBtn = document.getElementById('users-save');
    saveBtn.disabled = true; saveBtn.textContent = 'Сохраняем…';
    try {
      for (var j = 0; j < uWorking.length; j++) {
        var uu = uWorking[j];
        var login2 = uu.login.trim();
        var pass2 = (uu.pass || '').trim();
        var res;
        if (!uu.orig) {
          res = await supabase.rpc('create_user', { p_token: session.token, p_login: login2, p_password: pass2, p_role: uu.role });
        } else {
          res = await supabase.rpc('update_user', { p_token: session.token, p_old_login: uu.orig, p_new_login: login2, p_password: pass2 || null, p_role: uu.role });
        }
        if (res.error) throw res.error;
      }
      closeUsers();
      flashHint('Доступы обновлены');
    } catch (e) {
      window.alert('Не удалось сохранить: ' + (e.message || e));
    }
    saveBtn.disabled = false; saveBtn.textContent = 'Сохранить';
  });

  // ---------- tabs manager ----------
  var tabsModal = document.getElementById('tabs-modal');
  var tabsListEl = document.getElementById('tabs-list');
  var tWorking = null;

  function cloneTabsConfig(cfg) {
    return { order: cfg.order.slice(), hidden: cfg.hidden.slice(), custom: Object.assign({}, cfg.custom) };
  }
  function labelFor(id) {
    var el = document.querySelector('.nav-btn[data-tab="' + id + '"] .nav-label');
    if (el) return el.textContent;
    if (BUILTIN_LABELS[id]) return BUILTIN_LABELS[id];
    return tWorking && tWorking.custom[id] ? 'Новый раздел' : id;
  }

  function renderTabsEditor() {
    tabsListEl.innerHTML = '';
    var full = tWorking.order.concat([TEST_ID]);
    full.forEach(function (id, i) {
      var isTest = id === TEST_ID;
      var isCustom = !!tWorking.custom[id];
      var row = document.createElement('div'); row.className = 'user-row';

      var head = document.createElement('div'); head.className = 'u-head';
      var title = document.createElement('span'); title.className = 'u-title';
      title.textContent = labelFor(id) + (isTest ? ' (тест)' : '');
      head.appendChild(title);
      if (tWorking.hidden.indexOf(id) !== -1) {
        var badge = document.createElement('span'); badge.className = 'tab-hidden-badge'; badge.textContent = 'скрыта';
        head.appendChild(badge);
      }
      row.appendChild(head);

      var actions = document.createElement('div'); actions.className = 'tab-row-actions';

      if (!isTest) {
        var order = tWorking.order;
        var up = document.createElement('button'); up.type = 'button'; up.className = 'btn secondary'; up.textContent = '↑ Выше';
        up.disabled = (i === 0);
        up.addEventListener('click', function () {
          var idx = order.indexOf(id);
          if (idx > 0) { var t = order[idx - 1]; order[idx - 1] = order[idx]; order[idx] = t; renderTabsEditor(); }
        });
        var down = document.createElement('button'); down.type = 'button'; down.className = 'btn secondary'; down.textContent = '↓ Ниже';
        down.disabled = (i === order.length - 1);
        down.addEventListener('click', function () {
          var idx = order.indexOf(id);
          if (idx > -1 && idx < order.length - 1) { var t = order[idx + 1]; order[idx + 1] = order[idx]; order[idx] = t; renderTabsEditor(); }
        });
        actions.appendChild(up); actions.appendChild(down);

        var toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'btn secondary';
        var hiddenNow = tWorking.hidden.indexOf(id) !== -1;
        toggle.textContent = hiddenNow ? 'Показать' : 'Скрыть';
        toggle.addEventListener('click', function () {
          var hi = tWorking.hidden.indexOf(id);
          if (hi === -1) tWorking.hidden.push(id); else tWorking.hidden.splice(hi, 1);
          renderTabsEditor();
        });
        actions.appendChild(toggle);
      }

      if (isCustom) {
        var del = document.createElement('button'); del.type = 'button'; del.className = 'u-del'; del.textContent = 'Удалить';
        del.addEventListener('click', function () {
          if (!window.confirm('Удалить вкладку «' + labelFor(id) + '»? Содержимое будет удалено безвозвратно.')) return;
          delete tWorking.custom[id];
          var oi = tWorking.order.indexOf(id); if (oi > -1) tWorking.order.splice(oi, 1);
          var hi = tWorking.hidden.indexOf(id); if (hi > -1) tWorking.hidden.splice(hi, 1);
          renderTabsEditor();
        });
        actions.appendChild(del);
      }

      row.appendChild(actions);
      tabsListEl.appendChild(row);
    });
  }

  function openTabsEditor() { tWorking = cloneTabsConfig(tabsConfig); renderTabsEditor(); tabsModal.hidden = false; }
  function closeTabsEditor() { tabsModal.hidden = true; }

  document.getElementById('ab-tabs').addEventListener('click', openTabsEditor);
  document.getElementById('tabs-modal-close').addEventListener('click', closeTabsEditor);
  document.getElementById('tabs-cancel').addEventListener('click', closeTabsEditor);
  tabsModal.addEventListener('click', function (e) { if (e.target === tabsModal) closeTabsEditor(); });

  document.getElementById('tabs-add').addEventListener('click', function () {
    var id = makeTabId();
    tWorking.custom[id] = true;
    tWorking.order.push(id);
    renderTabsEditor();
    tabsListEl.scrollTop = tabsListEl.scrollHeight;
  });

  document.getElementById('tabs-save').addEventListener('click', async function () {
    tabsConfig = cloneTabsConfig(tWorking);
    overrides.edits.__tabs = { order: tabsConfig.order, hidden: tabsConfig.hidden, custom: tabsConfig.custom };
    renderModules();
    captureDefaults();
    applyContent();
    refreshNav();

    var activeBtn = document.querySelector('.nav-btn.active');
    if (!activeBtn || activeBtn.hidden) {
      switchTo(learningIds()[0] || TEST_ID);
    }

    var saveBtn = document.getElementById('tabs-save');
    saveBtn.disabled = true; saveBtn.textContent = 'Сохраняем…';
    try {
      await persistContent();
      flashHint('Вкладки обновлены');
      closeTabsEditor();
    } catch (e) {
      window.alert('Не удалось сохранить — проверьте связь.');
    }
    saveBtn.disabled = false; saveBtn.textContent = 'Сохранить';
  });

  // ---------- boot ----------
  if (session && session.token) {
    showApp().catch(function () { clearSession(); showGate(); });
  } else {
    showGate();
  }
})();
