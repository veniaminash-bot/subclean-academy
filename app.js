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
  var LEARNING = ['standards', 'process', 'surfaces', 'chemistry', 'rules'];

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
  var editEls = Array.prototype.slice.call(document.querySelectorAll('[data-edit]'));
  var DEFAULTS = {};
  editEls.forEach(function (el) { DEFAULTS[el.getAttribute('data-edit')] = el.innerHTML; });
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

  var navButtons = Array.prototype.slice.call(document.querySelectorAll('.nav-btn'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('section.panel'));

  function isUnlocked(tab) {
    if (tab === 'standards') return true;
    var idx = LEARNING.indexOf(tab);
    if (idx > 0) return !!completed[LEARNING[idx - 1]];
    if (tab === 'test') return LEARNING.every(function (m) { return completed[m]; });
    return true;
  }
  function completedCount() { return LEARNING.filter(function (m) { return completed[m]; }).length; }

  function refreshNav() {
    navButtons.forEach(function (btn) {
      var tab = btn.dataset.tab;
      var state = btn.querySelector('.nav-state');
      btn.classList.remove('done', 'locked');
      if (completed[tab]) { btn.classList.add('done'); if (state) state.textContent = '✓'; }
      else if (!isUnlocked(tab)) { btn.classList.add('locked'); if (state) state.textContent = '🔒'; }
      else { if (state) state.textContent = ''; }
    });
    LEARNING.forEach(function (m) {
      var foot = document.querySelector('.module-foot[data-module="' + m + '"]');
      if (foot) foot.classList.toggle('is-done', !!completed[m]);
    });
    var done = completedCount();
    document.getElementById('rp-count').textContent = done + ' / ' + LEARNING.length;
    document.getElementById('rp-fill').style.width = Math.round((done / LEARNING.length) * 100) + '%';
  }

  function switchTo(tab) {
    if (!isUnlocked(tab)) return false;
    navButtons.forEach(function (b) { b.classList.remove('active'); });
    panels.forEach(function (p) { p.classList.remove('active'); });
    var btn = document.querySelector('.nav-btn[data-tab="' + tab + '"]');
    if (btn) btn.classList.add('active');
    document.getElementById('panel-' + tab).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  }

  var editing = false;
  navButtons.forEach(function (btn) { btn.addEventListener('click', function () { if (!editing) switchTo(btn.dataset.tab); }); });

  Array.prototype.slice.call(document.querySelectorAll('.module-foot')).forEach(function (foot) {
    var mod = foot.dataset.module, next = foot.dataset.next;
    var studyBtn = foot.querySelector('.study-btn');
    var nextBtn = foot.querySelector('.next-btn');
    if (studyBtn) studyBtn.addEventListener('click', async function () {
      completed[mod] = true;
      await persistProgress();
      refreshNav();
      if (next) switchTo(next);
    });
    if (nextBtn) nextBtn.addEventListener('click', function () { if (next) switchTo(next); });
  });

  document.getElementById('reset-progress').addEventListener('click', async function () {
    if (!window.confirm('Сбросить ваш прогресс обучения?')) return;
    completed = {};
    await persistProgress();
    refreshNav();
    switchTo('standards');
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

  // ---------- admin: export / import ----------
  function fallbackDownload(filename, data) {
    var blob = new Blob([data], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 100);
  }
  document.getElementById('ab-export').addEventListener('click', async function () {
    var users = [];
    try {
      var res = await supabase.rpc('list_users', { p_token: session.token });
      if (!res.error) users = res.data;
    } catch (e) {}
    var data = JSON.stringify({ edits: overrides.edits, quiz: overrides.quiz, users: users }, null, 2);
    var filename = 'subclean-content.json';
    if (window.claude && window.claude.downloads && typeof window.claude.downloads.save === 'function') {
      window.claude.downloads.save({ filename: filename, data: data }).then(function () { flashHint('Файл контента сохранён'); })
        .catch(function (err) { if (err && err.code === 'declined') return; fallbackDownload(filename, data); });
    } else {
      fallbackDownload(filename, data);
    }
  });

  var importFile = document.getElementById('import-file');
  document.getElementById('ab-import').addEventListener('click', function () { importFile.click(); });
  importFile.addEventListener('change', function () {
    var file = importFile.files && importFile.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = async function () {
      try {
        var parsed = JSON.parse(reader.result);
        overrides.edits = (parsed.edits && typeof parsed.edits === 'object') ? parsed.edits : {};
        overrides.quiz = Array.isArray(parsed.quiz) ? parsed.quiz : null;
        await persistContent();
        applyContent();
        buildQuiz();
        flashHint('Контент импортирован (учётные записи из файла нужно завести вручную в «Админ-панели»)');
      } catch (e) {
        window.alert('Не удалось прочитать файл: неверный формат JSON.');
      }
      importFile.value = '';
    };
    reader.readAsText(file);
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

  async function openUsers() {
    usersList.innerHTML = '<p style="color:var(--ink-soft);font-size:0.9rem">Загрузка…</p>';
    usersModal.hidden = false;
    try {
      var res = await supabase.rpc('list_users', { p_token: session.token });
      if (res.error) throw res.error;
      uWorking = res.data.map(function (u) { return { login: u.login, pass: '', role: u.role, orig: u.login }; });
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
      var row = document.createElement('div'); row.className = 'user-row';

      var f1 = document.createElement('div'); f1.className = 'uf';
      var l1 = document.createElement('label'); l1.textContent = 'Логин';
      if (u.orig && session && u.orig === session.login) { var you = document.createElement('span'); you.className = 'u-you'; you.textContent = 'вы'; l1.appendChild(you); }
      var i1 = document.createElement('input'); i1.type = 'text'; i1.className = 'u-input'; i1.value = u.login;
      i1.addEventListener('input', function () { u.login = i1.value; });
      f1.appendChild(l1); f1.appendChild(i1);

      var f2 = document.createElement('div'); f2.className = 'uf';
      var l2 = document.createElement('label'); l2.textContent = u.orig ? 'Новый пароль (необязательно)' : 'Пароль';
      var i2 = document.createElement('input'); i2.type = 'text'; i2.className = 'u-input'; i2.value = u.pass;
      i2.placeholder = u.orig ? 'оставьте пустым, если не меняете' : '';
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

      var del = document.createElement('button'); del.type = 'button'; del.className = 'u-del'; del.textContent = 'Удалить';
      if (u.orig && session && u.orig === session.login) { del.disabled = true; del.title = 'Нельзя удалить свою учётную запись'; }
      del.addEventListener('click', async function () {
        if (u.orig) {
          if (!window.confirm('Удалить пользователя «' + u.orig + '»?')) return;
          try { await supabase.rpc('delete_user', { p_token: session.token, p_login: u.orig }); }
          catch (e) { window.alert('Не удалось удалить: ' + (e.message || e)); return; }
        }
        uWorking.splice(i, 1);
        renderUsers();
      });

      row.appendChild(f1); row.appendChild(f2); row.appendChild(f3); row.appendChild(del);
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

  // ---------- boot ----------
  if (session && session.token) {
    showApp().catch(function () { clearSession(); showGate(); });
  } else {
    showGate();
  }
})();
