/* تاجر — تتبّع الطرود
   شركات التوصيل الجزائرية لا تتيح الاستعلام إلا للتجّار المشتركين
   بمفاتيح خاصة، وعلي إكسبريس يحجب الطلبات الآلية. لذلك تفتح الأداة
   صفحة التتبّع الرسمية لكل شركة بالرقم جاهزاً، وتحفظ طرودك محلياً
   بأسمائها فترى قائمتك كاملة وتضغط أيّها لتتبّعه.
   لتعطيله: احذف سطر <script src="/track.js"> من index.html */
(function () {
  'use strict';

  // الروابط الرسمية — تُفتح في تبويب جديد بالرقم جاهزاً حيث أمكن
  // ملاحظة مهمة: معظم شركات التوصيل الجزائرية الصغيرة تعمل على منصّة
  // Ecotrack نفسها ولا تملك صفحات تتبّع مستقلّة، لذلك نوجّهها إليها.
  // والشركات الدولية تُوجَّه إلى 17track الذي يغطّي أكثر من 2000 شركة
  // بينها Cainiao (علي إكسبريس) وTemu وShein.
  var ECO  = function (n) { return 'https://suivi.ecotrack.dz/fr?tracking=' + encodeURIComponent(n); };
  var T17  = function (n) { return 'https://t.17track.net/ar#nums=' + encodeURIComponent(n); };

  var CARRIERS = [
    // ── جزائرية ──
    { id: 'yal',  name: 'ياليدين — Yalidine', icon: '🟡', g: 'dz',
      url: function (n) { return 'https://yalidine.com/suivre-un-colis/?tracking=' + encodeURIComponent(n); },
      test: function (n) { return /^yal[-\s]?/i.test(n); } },

    { id: 'noe',  name: 'نويست — NOEST', icon: '🔵', g: 'dz',
      url: function (n) { return 'https://app.noest-dz.com/list/t?tracking=' + encodeURIComponent(n); },
      test: function (n) { return /^noe/i.test(n); } },

    { id: 'zr',   name: 'زد آر إكسبريس — ZR Express', icon: '🟣', g: 'dz',
      url: function () { return 'https://zrexpress.com/'; },
      test: function (n) { return /^zr/i.test(n); } },

    { id: 'may',  name: 'مايسترو — Maystro', icon: '🟠', g: 'dz',
      url: function () { return 'https://maystro-delivery.com/'; },
      test: function (n) { return /^may/i.test(n); } },

    { id: 'eco',  name: 'إيكوتراك — Ecotrack', icon: '🟢', g: 'dz',
      note: 'منصّة تجمع أكثر من 19 شركة توصيل جزائرية',
      url: ECO, test: function () { return false; } },

    { id: 'gue',  name: 'غيبكس — Guepex Express', icon: '🚚', g: 'dz',
      note: 'يعمل على منصّة Ecotrack', url: ECO, test: function () { return false; } },

    { id: 'dhd',  name: 'DHD Express', icon: '🚚', g: 'dz',
      note: 'يعمل على منصّة Ecotrack', url: ECO, test: function () { return false; } },

    { id: 'wex',  name: 'وورلد إكسبريس — World Express', icon: '🚚', g: 'dz',
      note: 'يعمل على منصّة Ecotrack', url: ECO, test: function () { return false; } },

    { id: 'cnx',  name: 'كونكسلوغ — Conexlog', icon: '🚚', g: 'dz',
      note: 'يعمل على منصّة Ecotrack', url: ECO, test: function () { return false; } },

    { id: 'msm',  name: 'MSM Go', icon: '🚚', g: 'dz',
      note: 'يعمل على منصّة Ecotrack', url: ECO, test: function () { return false; } },

    { id: 'and',  name: 'أندرسون — Anderson', icon: '🚚', g: 'dz',
      note: 'إن لم يظهر الطرد جرّب Ecotrack', url: ECO, test: function () { return false; } },

    { id: 'roc',  name: 'روكيت — Rocket Delivery', icon: '🚚', g: 'dz',
      note: 'إن لم يظهر الطرد جرّب Ecotrack', url: ECO, test: function () { return false; } },

    { id: 'ecd',  name: 'إي-كومدال — E-Comdel', icon: '🚚', g: 'dz',
      note: 'إن لم يظهر الطرد جرّب Ecotrack', url: ECO, test: function () { return false; } },

    { id: 'kaz',  name: 'كازي تور — Kazi Tour', icon: '🚚', g: 'dz',
      note: 'إن لم يظهر الطرد جرّب Ecotrack', url: ECO, test: function () { return false; } },

    { id: 'post', name: 'بريد الجزائر — EMS', icon: '📮', g: 'dz',
      url: T17,
      test: function (n) { return /^[A-Z]{2}\d{9}DZ$/i.test(n.replace(/\s/g, '')); } },

    // ── دولية ──
    { id: 'ali',  name: 'علي إكسبريس — AliExpress', icon: '🛒', g: 'intl',
      note: 'يشمل Cainiao وكل شركاء علي إكسبريس', url: T17,
      test: function (n) { return /^(LP|LZ|LY|SY|AE)\w{8,}/i.test(n.replace(/\s/g, '')); } },

    { id: 'temu', name: 'تيمو — Temu', icon: '🛍️', g: 'intl', url: T17,
      test: function () { return false; } },

    { id: 'shn',  name: 'شي إن — Shein', icon: '👗', g: 'intl', url: T17,
      test: function () { return false; } },

    { id: 'amz',  name: 'أمازون — Amazon', icon: '📦', g: 'intl', url: T17,
      test: function (n) { return /^TBA\d{10,}/i.test(n.replace(/\s/g, '')); } },

    { id: 'dhl',  name: 'دي إتش إل — DHL', icon: '✈️', g: 'intl', url: T17,
      test: function (n) { return /^\d{10}$/.test(n.replace(/\s/g, '')); } },

    { id: 'fdx',  name: 'فيديكس — FedEx', icon: '✈️', g: 'intl', url: T17,
      test: function (n) { return /^\d{12}$/.test(n.replace(/\s/g, '')); } },

    { id: 'ups',  name: 'يو بي إس — UPS', icon: '✈️', g: 'intl', url: T17,
      test: function (n) { return /^1Z\w{16}$/i.test(n.replace(/\s/g, '')); } },

    { id: 'arx',  name: 'أرامكس — Aramex', icon: '✈️', g: 'intl', url: T17,
      test: function () { return false; } },

    { id: 'chp',  name: 'بريد الصين — China Post', icon: '🇨🇳', g: 'intl', url: T17,
      test: function (n) { return /^[A-Z]{2}\d{9}CN$/i.test(n.replace(/\s/g, '')); } },

    { id: 'intl', name: 'شركة أخرى — بحث شامل', icon: '🌍', g: 'intl',
      note: 'يبحث في أكثر من 2000 شركة توصيل حول العالم', url: T17,
      test: function () { return false; } }
  ];

  var KEY = 'tj_parcels';

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 60))); } catch (e) {}
  }
  function detect(num) {
    var n = String(num || '').trim();
    for (var i = 0; i < CARRIERS.length; i++) {
      if (CARRIERS[i].test(n)) return CARRIERS[i].id;
    }
    return '';
  }
  function byId(id) {
    for (var i = 0; i < CARRIERS.length; i++) if (CARRIERS[i].id === id) return CARRIERS[i];
    return null;
  }

  var HDR = function (icon, title, sub) {
    return '<div class="hdr"><button class="back-btn" onclick="back()">' +
      '<svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>' +
      '<div class="hdr-info"><h3>' + icon + ' ' + title + '</h3><p>' + sub + '</p></div></div>';
  };

  function buildScreen() {
    if (el('sv-track')) return;
    var first = document.querySelector('.screen');
    var host = first && first.parentNode;
    if (!host) return;

    var opt = function (c) {
      return '<option value="' + c.id + '">' + c.icon + ' ' + c.name + '</option>';
    };
    var dzList = [], inList = [];
    for (var q = 0; q < CARRIERS.length; q++) {
      (CARRIERS[q].g === 'intl' ? inList : dzList).push(opt(CARRIERS[q]));
    }
    var opts = '<optgroup label="🇩🇿 شركات جزائرية">' + dzList.join('') + '</optgroup>' +
               '<optgroup label="🌍 دولية وتسوّق عالمي">' + inList.join('') + '</optgroup>';

    var d = document.createElement('div');
    d.className = 'screen';
    d.id = 'sv-track';
    d.innerHTML = HDR('📦', 'تتبّع الطرود', 'كل شركات التوصيل في مكان واحد') +
      '<div class="svc-body">' +
      '<div style="background:var(--gold-dim);border:1px solid var(--line);border-radius:var(--r);' +
        'padding:12px;font-size:.8rem;color:var(--gold-l);line-height:1.6;">' +
        '📦 احفظ أرقام طرودك هنا، واضغط أيّها لفتح صفحة التتبّع الرسمية مباشرة.</div>' +

      '<div class="f-label">رقم التتبّع</div>' +
      '<input class="f-input" id="trNum" placeholder="yal-3F2A9B" dir="ltr" ' +
        'oninput="tjTrDetect()" autocomplete="off">' +
      '<div class="f-label">شركة التوصيل</div>' +
      '<select class="f-input" id="trCo" onchange="tjTrNote()">' + opts + '</select>' +
      '<div id="trHint" style="font-size:.72rem;color:var(--muted);margin-top:5px;"></div>' +
      '<div class="f-label">اسم للطرد (اختياري)</div>' +
      '<input class="f-input" id="trName" maxlength="40" placeholder="طلبية محمد — حقيبة">' +

      '<button class="btn-gold" onclick="typeof tjTrLive===\'function\'?tjTrLive():tjTrGo()">' +
        '📡 اعرض الحالة هنا</button>' +
      '<div id="trLive" style="display:none;margin-top:14px;"></div>' +
      '<button class="btn-copy" style="width:100%;margin-top:8px;" onclick="tjTrGo()">' +
        '🔗 فتح موقع الشركة</button>' +
      '<button class="btn-copy" style="width:100%;margin-top:8px;" onclick="tjTrSave()">' +
        '💾 حفظ في قائمتي</button>' +
      '<div id="trErr" style="display:none;color:#E74C3C;font-size:.82rem;margin-top:10px;"></div>' +

      '<div id="trListBox" style="margin-top:22px;"></div>' +
      '</div>';
    host.appendChild(d);
    renderList();
  }

  function buildCard() {
    if (el('tjCardTr')) return;
    var grid = document.querySelector('.svc-grid');
    if (!grid) return;
    var model = null, all = grid.querySelectorAll('.svc-card');
    for (var i = 0; i < all.length; i++) {
      var c = all[i];
      if (!c.querySelector('.pro-tag') && !c.querySelector('.pro-lock-tag')
          && c.style.display !== 'none') { model = c; break; }
    }
    if (!model) return;
    var b = model.cloneNode(true);
    b.id = 'tjCardTr';
    b.setAttribute('onclick', "goFree('track')");
    b.classList.remove('locked');
    var ids = b.querySelectorAll('[id]');
    for (var j = 0; j < ids.length; j++) ids[j].removeAttribute('id');
    var i18 = b.querySelectorAll('[data-i18n]');
    for (var k = 0; k < i18.length; k++) i18[k].removeAttribute('data-i18n');
    var ic = b.querySelector('.svc-icon'), nm = b.querySelector('.svc-name'),
        sb = b.querySelector('.svc-sub');
    if (ic) ic.textContent = '📦';
    if (nm) nm.textContent = 'تتبّع الطرود';
    if (sb) sb.textContent = 'ياليدين · نويست · علي إكسبريس';
    grid.appendChild(b);
  }

  // كشف الشركة من شكل الرقم
  window.tjTrDetect = function () {
    var n = (el('trNum').value || '').trim();
    var hint = el('trHint');
    var id = detect(n);
    if (id) {
      el('trCo').value = id;
      var c = byId(id);
      hint.innerHTML = '✓ تعرّفنا على الشركة: <b style="color:var(--gold);">' +
        esc(c.name) + '</b>';
    } else {
      var cur = byId(el('trCo').value);
      hint.textContent = (cur && cur.note) ? cur.note : '';
    }
  };

  window.tjTrNote = function () {
    var c = byId(el('trCo').value);
    el('trHint').textContent = (c && c.note) ? c.note : '';
  };

  window.tjTrGo = function () {
    var n = (el('trNum').value || '').trim();
    var errEl = el('trErr');
    errEl.style.display = 'none';
    if (!n) {
      errEl.textContent = '❌ اكتب رقم التتبّع أولاً.';
      errEl.style.display = 'block';
      return;
    }
    open(el('trCo').value, n);
  };

  function open(coId, num) {
    var c = byId(coId) || CARRIERS[0];
    var w = window.open(c.url(num), '_blank', 'noopener');
    if (!w && typeof window.showToast === 'function') {
      window.showToast('امنح المتصفّح إذن فتح النوافذ');
    }
    if (typeof window.saveHist === 'function') {
      window.saveHist('📦 تتبّع طرد', 'فُتح تتبّع ' + c.name);
    }
  }
  window.tjTrOpen = function (coId, num) { open(coId, num); };

  window.tjTrSave = function () {
    var n = (el('trNum').value || '').trim();
    var errEl = el('trErr');
    errEl.style.display = 'none';
    if (!n) {
      errEl.textContent = '❌ اكتب رقم التتبّع أولاً.';
      errEl.style.display = 'block';
      return;
    }
    var list = load();
    for (var i = 0; i < list.length; i++) {
      if (list[i].n === n) {
        errEl.textContent = '❌ هذا الرقم محفوظ مسبقاً.';
        errEl.style.display = 'block';
        return;
      }
    }
    list.unshift({
      n: n,
      c: el('trCo').value,
      t: (el('trName').value || '').trim(),
      d: Date.now()
    });
    save(list);
    el('trNum').value = '';
    el('trName').value = '';
    el('trHint').textContent = '';
    renderList();
    if (typeof window.showToast === 'function') window.showToast('✓ حُفظ الطرد');
  };

  window.tjTrDel = function (i) {
    var list = load();
    list.splice(i, 1);
    save(list);
    renderList();
  };

  function renderList() {
    var box = el('trListBox');
    if (!box) return;
    var list = load();
    if (!list.length) {
      box.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:.82rem;' +
        'padding:24px 0;">لا طرود محفوظة بعد.</div>';
      return;
    }
    box.innerHTML = '<div class="f-label" style="margin-bottom:8px;">📋 طرودي (' +
      list.length + ')</div>' +
      list.map(function (p, i) {
        var c = byId(p.c) || CARRIERS[0];
        var when = new Date(p.d).toLocaleDateString('ar-DZ');
        return '<div style="background:var(--panel);border:1px solid var(--line);' +
          'border-radius:var(--r);padding:12px;margin-bottom:8px;display:flex;' +
          'align-items:center;gap:10px;">' +
          '<div style="font-size:1.3rem;flex-shrink:0;">' + c.icon + '</div>' +
          '<div style="flex:1;min-width:0;">' +
            (p.t ? '<div style="font-size:.86rem;font-weight:700;">' + esc(p.t) + '</div>' : '') +
            '<div style="font-size:.78rem;direction:ltr;text-align:start;' +
              'word-break:break-all;color:var(--gold);">' + esc(p.n) + '</div>' +
            '<div style="font-size:.68rem;color:var(--muted);">' + esc(c.name) +
              ' · ' + when + '</div>' +
          '</div>' +
          '<button onclick="tjTrOpen(\'' + esc(p.c) + '\',\'' + esc(p.n).replace(/'/g, '') +
            '\')" style="background:var(--gold);color:var(--ink);border:0;border-radius:9px;' +
            'padding:9px 14px;font-weight:700;font-size:.76rem;cursor:pointer;' +
            'font-family:inherit;flex-shrink:0;">تتبّع</button>' +
          '<button onclick="tjTrDel(' + i + ')" style="background:transparent;' +
            'border:1px solid var(--line);color:#E74C3C;border-radius:9px;padding:9px 11px;' +
            'cursor:pointer;font-family:inherit;flex-shrink:0;">✕</button>' +
        '</div>';
      }).join('');
  }

  function run() {
    try { buildScreen(); } catch (e) {}
    try { buildCard(); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else { run(); }
  [500, 1500, 3500].forEach(function (ms) { setTimeout(run, ms); });
})();
