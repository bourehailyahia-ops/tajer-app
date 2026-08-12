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
    var s = sess();
    var h = { 'Content-Type': 'application/json', 'apikey': KEY };
    h['Authorization'] = 'Bearer ' + ((s && s.access_token) ? s.access_token : KEY);
    var body = { action: action };
    for (var k in (payload || {})) body[k] = payload[k];
    return fetch(FN, { method: 'POST', headers: h, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }); });
  }
  function q(name) {
    return new URLSearchParams(location.search).get(name);
  }
  function clean() {
    try { history.replaceState({}, '', location.pathname); } catch (e) {}
  }

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

  // ---------- 2) الشراء ----------
  function buy(productId, currency) {
    if (!sess()) {
      toast('سجّل الدخول أولاً لإتمام الشراء');
      if (typeof window.openAuth === 'function') window.openAuth();
      return;
    }
    modal('<p style="margin:0">جارٍ تجهيز الدفع…</p>');
    call('checkout', { product_id: productId, currency: currency })
      .then(function (d) {
        if (d && d.ok && d.checkout_url) {
          try { sessionStorage.setItem('tj_mk_order', d.order_id); } catch (e) {}
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
        toast(msgs[d && d.error] || 'تعذّر بدء الدفع.');
      })
      .catch(function () { closeModal(); toast('تعذّر الاتصال. تحقّق من الإنترنت.'); });
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
      if (d && d.ok && d.url) { window.open(d.url, '_blank'); closeModal(); return; }
      var m = { link_expired: 'انتهت صلاحية الرابط.', limit_reached: 'بلغت الحد الأقصى للتحميلات.',
                not_paid: 'لم يُسجَّل الدفع بعد.' };
      toast(m[d && d.error] || 'تعذّر التحميل.');
    }).catch(function () { toast('تعذّر التحميل.'); });
  }
  window.mkDownload = download;

  // ---------- 5) زر «متجري» ----------
  function addSellerLink() {
    if (!sess()) return;
    fetch(SB + '/rest/v1/sellers?select=slug,status&limit=1',
          { headers: { apikey: KEY, Authorization: 'Bearer ' + sess().access_token } })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        var me = rows && rows[0];
        if (!me || !me.slug) return;
        if (document.getElementById('mkSellerBtn')) return;
        var host = document.getElementById('proCountdown') ||
                   document.getElementById('stAbout') ||
                   document.body;
        var a = document.createElement('a');
        a.id = 'mkSellerBtn';
        a.href = '/seller-dashboard.html';
        a.textContent = '🏪 لوحة متجري';
        a.style.cssText = 'display:block;text-align:center;background:#151922;' +
          'border:1px solid #C9A84C;color:#C9A84C;border-radius:12px;padding:12px;' +
          'margin:12px 0;text-decoration:none;font-weight:700;font-size:.88rem';
        host.parentNode ? host.parentNode.insertBefore(a, host) : host.appendChild(a);
      })
      .catch(function () {});
  }

  // ---------- التشغيل ----------
  function start() {
    try { captureRef(); } catch (e) {}
    try {
      var pid = q('p');
      if (pid) { openProduct(pid); clean(); }
      else if (q('buy') === 'ok') { afterPay(); clean(); }
      else if (q('buy') === 'fail') { toast('أُلغيت عملية الدفع.'); clean(); }
    } catch (e) {}
    setTimeout(function () { try { addSellerLink(); } catch (e) {} }, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
