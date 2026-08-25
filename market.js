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
      // نحفظ ما أراد شراءه، ونُكمل تلقائياً بعد تسجيل الدخول.
      // بدون هذا كان المستخدم يُنقل لصفحة حسابه وينسى المنتج.
      try {
        sessionStorage.setItem('tj_pending_buy',
          JSON.stringify({ p: productId, c: currency, t: Date.now() }));
      } catch (e) {}
      toast('سجّل الدخول لإتمام الشراء — سنكمل تلقائياً');
      if (typeof window.openAuth === 'function') window.openAuth();
      watchLogin();
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
  window.mkOpenProduct = openProduct;
  window.mkBuy = buy;

  // يراقب تسجيل الدخول ثم يستأنف الشراء المعلّق
  var loginWatch = null;
  function watchLogin() {
    if (loginWatch) return;
    var tries = 0;
    loginWatch = setInterval(function () {
      tries++;
      if (tries > 240) { clearInterval(loginWatch); loginWatch = null; return; }
      if (!sess()) return;
      clearInterval(loginWatch); loginWatch = null;
      setTimeout(resumeBuy, 700);
    }, 1000);
  }

  function resumeBuy() {
    var raw = null;
    try { raw = sessionStorage.getItem('tj_pending_buy'); } catch (e) {}
    if (!raw) return;
    var p = null;
    try { p = JSON.parse(raw); } catch (e) {}
    try { sessionStorage.removeItem('tj_pending_buy'); } catch (e) {}
    if (!p || !p.p) return;
    // نتجاهل الطلبات القديمة (أكثر من 30 دقيقة)
    if (p.t && (Date.now() - p.t) > 1800000) return;
    if (!sess()) return;
    toast('نُكمل عملية الشراء…');
    buy(p.p, p.c || 'DZD');
  }

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

  // ---------- التشغيل ----------
  // إصلاح التوقّف: التطبيق لا يجدّد رمز الجلسة، فبعد ساعة يفشل
  // /auth/v1/user بـ403 و/profiles بـ401 ويعلق. نجدّد الرمز مبكراً،
  // وإن كان منتهياً نعيد تحميل الصفحة مرة واحدة ليبدأ التطبيق برمز صالح.
  function healSession() {
    var s = sess();
    if (!s || !s.access_token || !s.refresh_token) return;
    if (!expired(s.access_token)) return;

    var GUARD = 'tj_healed';
    var already = false;
    try { already = sessionStorage.getItem(GUARD) === '1'; } catch (e) {}
    if (already) return;                      // لا نعيد التحميل أكثر من مرة

    forceRefresh().then(function (ns) {
      if (!ns) return;
      try { sessionStorage.setItem(GUARD, '1'); } catch (e) {}
      location.reload();
    }).catch(function () {});
  }

  function start() {
    try { healSession(); } catch (e) {}
    try { setTimeout(resumeBuy, 1600); } catch (e) {}
    try { installBgFix(); } catch (e) {}
    try { if (q('from') === 'store') track('view_store', { detail: q('s') || '' }); } catch (e) {}
    try { captureRef(); } catch (e) {}
    try { claimRef(); } catch (e) {}
    try {
      var pid = q('p');
      if (pid) { openProduct(pid); clean(); }
      else if (q('buy') === 'ok') { afterPay(); clean(); }
      else if (q('buy') === 'fail') {
      track('failed', { detail: 'cancelled_at_gateway' });
      toast('أُلغيت عملية الدفع.'); clean();
    }
    } catch (e) {}
    // محاولات أولى سريعة
    [800, 2000, 4000].forEach(function (ms) {
      setTimeout(function () {
        try { installBgFix(); } catch (e) {}
      }, ms);
    });

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
