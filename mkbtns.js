/* تاجر — أزرار السوق في صفحة الحساب (ملف مستقل)
   يضيف: 🏪 لوحة متجري / افتح متجرك — و 🛠️ إدارة السوق للمالك.
   لتعطيله: احذف سطر <script src="/mkbtns.js"> من index.html */
(function () {
  'use strict';
  var SB  = 'https://rnaqsvmtszxgbvzaagzx.supabase.co';
  var KEY = 'sb_publishable_ly90vH9XsCT_05kxQenomw_LE5aCud-';

  function sess() {
    try { return JSON.parse(localStorage.getItem('tajer_session') || 'null'); }
    catch (e) { return null; }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function authFetch(url) {
    var s = sess();
    if (!s || !s.access_token) return Promise.resolve(null);
    return fetch(url, { headers: { apikey: KEY, Authorization: 'Bearer ' + s.access_token } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  // ---------- 5) زر «متجري» ----------
  // يوضع كعنصر في قائمة الإعدادات (صفحة الحساب) ليطابق تصميم التطبيق.
  // سبب سابق للعطل: كان يوضع داخل proBanner وهي display:none لغير المشتركين.
  function addSellerLink() {
    if (document.getElementById('mkSellerBtn')) return;

    var s0 = sess();
    if (!s0 || !s0.user || !s0.user.id) return;

    authFetch(SB + '/rest/v1/sellers?select=slug,status&user_id=eq.' +
      encodeURIComponent(s0.user.id))
      .then(function (rows) {
        if (document.getElementById('mkSellerBtn')) return;
        var isSeller = rows && rows[0] && rows[0].slug;

        // أعلى القائمة. كان يوضع قبل «عن التطبيق» وهو آخر عنصر،
        // فيقع في أسفل الشاشة ولا يراه المستخدم.
        var item = document.getElementById('authRow')
                || document.getElementById('adminRow');
        if (!item) {
          var anchor = document.getElementById('stAbout');
          item = anchor ? anchor.closest('.set-item') : null;
        }
        if (!item || !item.parentNode) return;

        var el = document.createElement('div');
        el.id = 'mkSellerBtn';
        el.className = 'set-item';
        el.style.cursor = 'pointer';
        el.onclick = function () {
          location.href = isSeller ? '/seller-dashboard.html' : '/seller-apply.html';
        };
        el.innerHTML =
          '<div class="set-l"><div class="set-icon">🏪</div><div>' +
          '<div class="set-name">' + (isSeller ? 'لوحة متجري' : 'افتح متجرك وابدأ البيع') + '</div>' +
          '<div class="set-sub">' + (isSeller
            ? 'أرباحي · منتجاتي · /s/' + esc(rows[0].slug)
            : 'بِع منتجاتك الرقمية واحتفظ بـ90%') + '</div>' +
          '</div></div>' +
          '<div class="chev"><svg viewBox="0 0 24 24" stroke-width="2">' +
          '<path d="M9 18l6-6-6-6"/></svg></div>';
        item.parentNode.insertBefore(el, item);
      })
      .catch(function () {});
  }

  // ---------- 6) رابط إدارة السوق (للمالك فقط) ----------
  // adminRow لا يظهره التطبيق إلا لمن profile.is_admin، فنستعمله كدليل.
  function addAdminLink() {
    if (document.getElementById('mkAdminBtn')) return;
    var row = document.getElementById('adminRow');
    if (!row || row.style.display === 'none' || !row.parentNode) return;

    var el = document.createElement('div');
    el.id = 'mkAdminBtn';
    el.className = 'set-item';
    el.style.cursor = 'pointer';
    el.onclick = function () { location.href = '/market-admin.html'; };
    el.innerHTML =
      '<div class="set-l"><div class="set-icon">🛠️</div><div>' +
      '<div class="set-name">إدارة السوق</div>' +
      '<div class="set-sub">اعتماد البائعين · المنتجات · التحويلات</div>' +
      '</div></div>' +
      '<div class="chev"><svg viewBox="0 0 24 24" stroke-width="2">' +
      '<path d="M9 18l6-6-6-6"/></svg></div>';
    row.parentNode.insertBefore(el, row.nextSibling);
  }


  // ═══════════════════════════════════════════════
  // إصلاح خدمة إزالة الخلفية
  // المشكلة: المكتبة تنزّل نموذجاً بحجم 44 ميغابايت من staticimgly.com،
  // والنسخة الأصلية لا تُظهر تقدّم التنزيل ولا سببه الحقيقي عند الفشل.
  // نستبدل الدالّة من هنا بلا لمس app.js.
  // ═══════════════════════════════════════════════
  function installBgFix() {
    if (typeof window.runBgRemove !== 'function') return;
    if (window.__bgFixed) return;
    window.__bgFixed = true;

    var el = function (id) { return document.getElementById(id); };
    var setTxt = function (t) { var n = el('bgLoadText'); if (n) n.textContent = t; };

    window.runBgRemove = async function () {
      var input = el('bgInput');
      var file = input && input.files && input.files[0];
      if (!file) { toast('اختر صورة أولاً'); return; }

      var loadEl = el('bg-load'), errEl = el('bg-err'),
          resEl = el('bg-res'), btnEl = el('bg-btn');
      if (loadEl) loadEl.style.display = 'block';
      if (errEl)  errEl.style.display  = 'none';
      if (resEl)  resEl.style.display  = 'none';
      if (btnEl)  btnEl.style.display  = 'none';

      var fail = function (msg) {
        if (loadEl) loadEl.style.display = 'none';
        if (btnEl)  btnEl.style.display  = 'block';
        if (errEl) { errEl.style.display = 'block'; errEl.textContent = '✕ ' + msg; }
      };

      try {
        if (typeof window.consumeUse === 'function') await window.consumeUse();

        setTxt('جارٍ تجهيز الصورة…');
        var img = file;
        if (typeof window.resizeImageFile === 'function') {
          img = await window.resizeImageFile(file, 1024);
        }

        setTxt('جارٍ تحميل المكتبة…');
        var sources = [
          'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/dist/browser.mjs',
          'https://esm.sh/@imgly/background-removal@1.5.5',
          'https://unpkg.com/@imgly/background-removal@1.5.5/dist/browser.mjs'
        ];
        var removeBackground = null, libErr = null;
        for (var i = 0; i < sources.length; i++) {
          try {
            var mod = await import(sources[i]);
            removeBackground = mod.removeBackground ||
                               (mod.default && mod.default.removeBackground) || mod.default;
            if (typeof removeBackground === 'function') break;
            removeBackground = null;
          } catch (e) { libErr = e; }
        }
        if (!removeBackground) {
          fail('تعذّر تحميل المكتبة. ' + String(libErr && libErr.message || '').slice(0, 80));
          return;
        }

        // النموذج الأصغر (‎~44 ميغابايت بدل 88). يُحمَّل مرة واحدة ويُحفَظ.
        var cfg = {
          model: 'isnet_quint8',
          output: { format: 'image/png', quality: 0.9 },
          progress: function (key, current, total) {
            var pct = total ? Math.round((current / total) * 100) : 0;
            var mb = total ? (total / 1048576).toFixed(0) : '?';
            if (String(key).indexOf('fetch') === 0 || String(key).indexOf('model') >= 0
                || String(key).indexOf('compute') < 0) {
              setTxt('تنزيل ملفات الذكاء الاصطناعي… ' + pct + '%  (' + mb +
                     ' م.ب — مرة واحدة فقط)');
            } else {
              setTxt('جارٍ المعالجة… ' + pct + '%');
            }
          }
        };

        setTxt('تنزيل ملفات الذكاء الاصطناعي… (أول مرة فقط، قد تأخذ دقائق)');
        var blob = await removeBackground(img, cfg);
        var url = URL.createObjectURL(blob);

        var r = el('bgResult'); if (r) r.src = url;
        var d = el('bgDownload'); if (d) { d.href = url; d.download = 'no-bg.png'; }
        if (loadEl) loadEl.style.display = 'none';
        if (resEl)  resEl.style.display  = 'block';
        if (typeof window.saveHist === 'function') {
          try { window.saveHist('🗑️ إزالة الخلفية', 'تمت إزالة خلفية صورة بنجاح'); } catch (e) {}
        }
      } catch (e) {
        var m = String((e && e.message) || e);
        if (m === 'LOGIN_REQUIRED') { fail('سجّل الدخول أولاً'); return; }
        if (m === 'LIMIT_REACHED')  { fail('انتهى رصيدك المجاني'); return; }
        if (m.indexOf('Failed to fetch') >= 0 || m.indexOf('NetworkError') >= 0) {
          fail('تعذّر تنزيل ملفات الذكاء الاصطناعي (حجمها ~44 م.ب). ' +
               'جرّب على WiFi ولا تغلق الصفحة أثناء التنزيل.');
          return;
        }
        fail(m.slice(0, 140));
      }
    };
  }

  function run() {
    try { addSellerLink(); } catch (e) {}
    try { addAdminLink(); } catch (e) {}
  }
  [800, 2000, 4000].forEach(function (ms) { setTimeout(run, ms); });

  // المستخدم قد يسجّل الدخول بعد فتح الصفحة
  var last = null;
  try { var s0 = sess(); last = s0 && s0.access_token; } catch (e) {}
  var w = setInterval(function () {
    if (document.getElementById('mkSellerBtn')) { clearInterval(w); return; }
    var s1 = sess(); var t = s1 && s1.access_token;
    if (t && t !== last) { last = t; run(); }
  }, 2500);
  setTimeout(function () { clearInterval(w); }, 600000);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) run();
  });
})();
