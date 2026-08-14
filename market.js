/* ===========================================================
   تاجر — ربط السوق بالتطبيق
   ملف مستقل تماماً: لا يعدّل أي دالّة موجودة، ولا يعتمد على
   شيء من app.js سوى showToast (مع بديل إن غاب).
   لتعطيله كلياً: احذف سطر <script src="/market.js"> من index.html
   =========================================================== */
(function () {
  'use strict';

  var SB   = 'https://rnaqsvmtszxgbvzaagzx.supabase.co';
  var KEY  = 'sb_publishable_ly90vH9XsCT_05kxQenomw_LE5aCud-';
  var FN   = SB + '/functions/v1/market-purchase';
  var REF_STORE = 'tj_ref';

  // ---------- أدوات ----------
  function sess() {
    try { return JSON.parse(localStorage.getItem('tajer_session') || 'null'); }
    catch (e) { return null; }
  }

  // هل انتهت صلاحية الرمز؟ (رموز سوبابيس تنتهي بعد ساعة)
  function expired(tok) {
    try {
      var p = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return !p.exp || (p.exp * 1000 - 60000) < Date.now();   // هامش دقيقة
    } catch (e) { return false; }   // تعذّر التحليل: نجرّب الرمز كما هو
  }

  // تجديد الجلسة. التطبيق لا يجدّدها، فأي طلب موثّق يفشل بعد ساعة.
  var refreshing = null;
  function freshSession() {
    var s = sess();
    if (!s || !s.access_token) return Promise.resolve(null);
    if (!expired(s.access_token)) return Promise.resolve(s);
    return forceRefresh().then(function (ns) { return ns || s; });
  }

  function forceRefresh() {
    var s = sess();
    if (!s || !s.refresh_token) return Promise.resolve(null);
    if (refreshing) return refreshing;

    refreshing = fetch(SB + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY },
      body: JSON.stringify({ refresh_token: s.refresh_token })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.access_token) return null;
        var ns = { access_token: d.access_token,
                   refresh_token: d.refresh_token || s.refresh_token,
                   user: d.user || s.user };
        try { localStorage.setItem('tajer_session', JSON.stringify(ns)); } catch (e) {}
        return ns;
      })
      .catch(function () { return null; })
      .then(function (v) { refreshing = null; return v; });

    return refreshing;
  }
  function toast(m) {
    if (typeof window.showToast === 'function') { window.showToast(m); return; }
    alert(m);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function call(action, payload) {
    return freshSession().then(function (s) {
      var h = { 'Content-Type': 'application/json', 'apikey': KEY };
      h['Authorization'] = 'Bearer ' + ((s && s.access_token) ? s.access_token : KEY);
      var body = { action: action };
      for (var k in (payload || {})) body[k] = payload[k];
      return fetch(FN, { method: 'POST', headers: h, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }); });
    });
  }
  function q(name) {
    return new URLSearchParams(location.search).get(name);
  }
  function clean() {
    try { history.replaceState({}, '', location.pathname); } catch (e) {}
  }

  // طلب موثّق: يعيد المحاولة مرة واحدة بعد تجديد الجلسة عند الرفض
  function authFetch(url) {
    return freshSession().then(function (s) {
      if (!s || !s.access_token) return null;
      var go = function (tok) {
        return fetch(url, { headers: { apikey: KEY, Authorization: 'Bearer ' + tok } });
      };
      return go(s.access_token).then(function (r) {
        if (r.ok) return r.json();
        if (r.status !== 401 && r.status !== 403) return null;
        return forceRefresh().then(function (ns) {
          if (!ns) return null;
          return go(ns.access_token).then(function (r2) { return r2.ok ? r2.json() : null; });
        });
      });
    }).catch(function () { return null; });
  }

  // ---------- قياس القِمع: أين يتوقّف الناس ----------
  function sessKey() {
    var k = null;
    try { k = localStorage.getItem('tj_sk'); } catch (e) {}
    if (!k) {
      k = Math.random().toString(36).slice(2) + Date.now().toString(36);
      try { localStorage.setItem('tj_sk', k); } catch (e) {}
    }
    return k;
  }

  function track(step, extra) {
    var body = { p_step: step, p_session: sessKey() };
    var e = extra || {};
    if (e.product)  body.p_product  = e.product;
    if (e.order)    body.p_order    = e.order;
    if (e.currency) body.p_currency = e.currency;
    if (e.amount)   body.p_amount   = e.amount;
    if (e.detail)   body.p_detail   = e.detail;

    var s = sess();
    var h = { apikey: KEY, 'Content-Type': 'application/json' };
    h['Authorization'] = 'Bearer ' + ((s && s.access_token) ? s.access_token : KEY);
    try {
      fetch(SB + '/rest/v1/rpc/track_funnel',
        { method: 'POST', headers: h, body: JSON.stringify(body), keepalive: true })
        .catch(function () {});
    } catch (e2) {}
  }
  window.mkTrack = track;

  // ---------- نافذة بسيطة ----------
  function modal(html) {
    var old = document.getElementById('mkModal');
    if (old) old.remove();
    var d = document.createElement('div');
    d.id = 'mkModal';
    d.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.72);' +
      'display:flex;align-items:center;justify-content:center;padding:18px;' +
      'font-family:system-ui,-apple-system,"Segoe UI",sans-serif';
    d.innerHTML =
      '<div style="background:#151922;border:1px solid #242a36;border-radius:16px;' +
      'max-width:400px;width:100%;padding:20px;color:#e8eaed;direction:rtl;text-align:center;' +
      'max-height:88vh;overflow:auto">' + html + '</div>';
    d.addEventListener('click', function (e) { if (e.target === d) d.remove(); });
    document.body.appendChild(d);
    return d;
  }
  function closeModal() {
    var m = document.getElementById('mkModal');
    if (m) m.remove();
  }
  window.mkClose = closeModal;

  var BTN = 'background:#C9A84C;color:#12151c;border:0;border-radius:10px;padding:12px;' +
            'font-weight:700;font-size:.9rem;width:100%;cursor:pointer;font-family:inherit';
  var BTN2 = 'background:transparent;color:#9aa0a6;border:1px solid #242a36;border-radius:10px;' +
             'padding:10px;font-size:.82rem;width:100%;cursor:pointer;margin-top:8px;font-family:inherit';

  // ---------- 1) تسجيل الإحالة ----------
  function captureRef() {
    var code = q('ref');
    if (!code) return;
    try { localStorage.setItem(REF_STORE, code); } catch (e) {}
    call('track_ref', {
      ref_code: code,
      src: q('src') || 'link',
      landing: location.pathname
    }).catch(function () {});
  }

  // تسجيل الإحادة في قاعدة البيانات (كان الكود يُحفظ محلياً فقط)
  function claimRef() {
    var code = null;
    try { code = localStorage.getItem(REF_STORE); } catch (e) {}
    if (!code) return;
    var s = sess();
    if (!s || !s.access_token) return;

    freshSession().then(function (fs) {
      if (!fs || !fs.access_token) return;
      return fetch(SB + '/rest/v1/rpc/claim_referral', {
        method: 'POST',
        headers: { apikey: KEY, Authorization: 'Bearer ' + fs.access_token,
                   'Content-Type': 'application/json' },
        body: JSON.stringify({ p_code: code })
      }).then(function (r) { return r.ok ? r.json() : null; });
    }).then(function (d) {
      // ننظّف الكود في كل الحالات النهائية حتى لا نكرّر المحاولة بلا فائدة
      if (d && (d.ok || ['already_attributed', 'self_referral',
                         'invalid_code', 'account_too_old'].indexOf(d.error) >= 0)) {
        try { localStorage.removeItem(REF_STORE); } catch (e) {}
      }
    }).catch(function () {});
  }

  // ---------- 2) الشراء ----------
  function buy(productId, currency) {
    track('click_buy', { product: productId, currency: currency });
    if (!sess()) {
      track('failed', { product: productId, detail: 'login_required' });
      toast('سجّل الدخول أولاً لإتمام الشراء');
      if (typeof window.openAuth === 'function') window.openAuth();
      return;
    }
    modal('<p style="margin:0">جارٍ تجهيز الدفع…</p>');
    call('checkout', { product_id: productId, currency: currency })
      .then(function (d) {
        if (d && d.ok && d.checkout_url) {
          try { sessionStorage.setItem('tj_mk_order', d.order_id); } catch (e) {}
          track('gateway_opened', { product: productId, order: d.order_id,
                                    currency: currency, amount: d.amount });
          location.href = d.checkout_url;
          return;
        }
        var msgs = {
          login_required: 'سجّل الدخول أولاً.',
          product_not_found: 'المنتج غير موجود.',
          product_unavailable: 'المنتج غير متاح حالياً.',
          seller_unavailable: 'متجر البائع غير مفعّل.',
          cannot_buy_own_product: 'لا يمكنك شراء منتجك أنت.',
          card_disabled: 'الدفع بالبطاقة غير مفعّل حالياً.',
          intl_disabled: 'الدفع بالدولار غير مفعّل حالياً.',
          price_unavailable_in_currency: 'هذا المنتج غير متاح بهذه العملة.',
          gateway_error: 'تعذّر الاتصال ببوابة الدفع. حاول بعد قليل.'
        };
        closeModal();
        track('failed', { product: productId, currency: currency,
                          detail: (d && d.error) || 'unknown' });
        toast(msgs[d && d.error] || 'تعذّر بدء الدفع.');
      })
      .catch(function () {
        closeModal();
        track('failed', { product: productId, detail: 'network' });
        toast('تعذّر الاتصال. تحقّق من الإنترنت.');
      });
  }
  window.mkBuy = buy;

  // ---------- 3) فتح منتج قادم من صفحة بائع ----------
  function openProduct(pid) {
    fetch(SB + '/rest/v1/digital_products?id=eq.' + encodeURIComponent(pid) +
          '&select=id,title,subtitle,description,icon,price_dzd,price_usd,file_format,pages,preview_url,seller_id',
          { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        var p = rows && rows[0];
        if (!p) { toast('المنتج غير متاح.'); return; }
        track('view_product', { product: p.id, amount: p.price_dzd });
        var usd = p.price_usd ? Number(p.price_usd).toFixed(2) : null;
        modal(
          '<div style="font-size:38px">' + esc(p.icon || '📘') + '</div>' +
          '<h3 style="margin:8px 0 4px;font-size:1.05rem">' + esc(p.title) + '</h3>' +
          (p.subtitle ? '<p style="color:#9aa0a6;font-size:.8rem;margin:0 0 10px">' + esc(p.subtitle) + '</p>' : '') +
          (p.description ? '<p style="color:#9aa0a6;font-size:.8rem;text-align:start;margin:10px 0">' +
             esc(String(p.description).slice(0, 300)) + '</p>' : '') +
          '<div style="font-size:1.25rem;color:#C9A84C;font-weight:800;margin:12px 0">' +
             Number(p.price_dzd || 0).toLocaleString('ar-DZ') + ' دج' +
             (usd ? '<span style="font-size:.75rem;color:#9aa0a6;margin-inline-start:8px">≈ $' + usd + '</span>' : '') +
          '</div>' +
          '<button style="' + BTN + '" onclick="mkBuy(\'' + esc(p.id) + '\',\'DZD\')">💳 ادفع بالبطاقة (دج)</button>' +
          (usd ? '<button style="' + BTN2 + '" onclick="mkBuy(\'' + esc(p.id) + '\',\'USD\')">₮ ادفع بـ USDT ($' + usd + ')</button>' : '') +
          '<button style="' + BTN2 + '" onclick="mkClose()">إغلاق</button>'
        );
      })
      .catch(function () { toast('تعذّر تحميل المنتج.'); });
  }

  // ---------- 4) بعد العودة من الدفع ----------
  function afterPay() {
    var oid = q('o');
    if (!oid) { try { oid = sessionStorage.getItem('tj_mk_order'); } catch (e) {} }
    if (!oid) return;
    modal('<p style="margin:0">جارٍ تأكيد الدفع…</p>');

    var tries = 0;
    (function poll() {
      tries++;
      call('verify', { order_id: oid }).then(function (d) {
        if (d && d.ok && d.status === 'paid') {
          try { sessionStorage.removeItem('tj_mk_order'); } catch (e) {}
          track('paid', { order: oid });
          modal(
            '<div style="font-size:40px">✅</div>' +
            '<h3 style="margin:8px 0">تم الدفع بنجاح</h3>' +
            '<p style="color:#9aa0a6;font-size:.82rem;margin:0 0 14px">ملفك جاهز للتحميل.</p>' +
            '<button style="' + BTN + '" onclick="mkDownload(\'' + esc(d.token) + '\')">⬇ تحميل الملف</button>' +
            '<button style="' + BTN2 + '" onclick="mkClose()">لاحقاً</button>'
          );
          return;
        }
        if (tries < 5) { setTimeout(poll, 2500); return; }
        track('abandoned', { order: oid, detail: 'not_confirmed' });
        modal(
          '<div style="font-size:38px">⏳</div>' +
          '<h3 style="margin:8px 0;font-size:1rem">لم يُؤكَّد الدفع بعد</h3>' +
          '<p style="color:#9aa0a6;font-size:.8rem;margin:0 0 14px">' +
          'إن كنت قد دفعت، قد يستغرق التأكيد دقائق. افتح «مشترياتي» لاحقاً.</p>' +
          '<button style="' + BTN2 + '" onclick="mkClose()">حسناً</button>'
        );
      }).catch(function () { closeModal(); });
    })();
  }

  function download(token) {
    toast('جارٍ تجهيز الرابط…');
    call('download', { token: token }).then(function (d) {
      if (d && d.ok && d.url) {
        track('download', {});
        window.open(d.url, '_blank'); closeModal(); return;
      }
      var m = { link_expired: 'انتهت صلاحية الرابط.', limit_reached: 'بلغت الحد الأقصى للتحميلات.',
                not_paid: 'لم يُسجَّل الدفع بعد.' };
      toast(m[d && d.error] || 'تعذّر التحميل.');
    }).catch(function () { toast('تعذّر التحميل.'); });
  }
  window.mkDownload = download;

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
            : 'بِع منتجاتك الرقمية واحتفظ بـ70%') + '</div>' +
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
        var blob =
