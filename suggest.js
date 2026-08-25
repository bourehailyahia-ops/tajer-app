/* تاجر — اقتراح المنتج المناسب بعد كل أداة مجانية
   الفكرة: اللحظة التي أثبتّ فيها للمستخدم أنك تفهم مشكلته
   هي أفضل لحظة لعرض الحلّ الكامل. لا نعرض المتجر لغريب،
   بل لمن انتفع بأداة للتوّ.
   لتعطيله: احذف سطر <script src="/suggest.js"> من index.html */
(function () {
  'use strict';

  var SB  = 'https://rnaqsvmtszxgbvzaagzx.supabase.co';
  var KEY = 'sb_publishable_ly90vH9XsCT_05kxQenomw_LE5aCud-';

  // أي منتج يناسب أي أداة — بكلمة مفتاحية من عنوان المنتج
  var MATCH = {
    'sv-desc':     { key: 'دليل',   line: 'تريد إتقان وصف منتجاتك؟' },
    'sv-seo':      { key: 'دليل',   line: 'تريد أن تظهر في جوجل؟' },
    'sv-landing':  { key: 'دليل',   line: 'تريد صفحة بيع تُقنع فعلاً؟' },
    'sv-ads':      { key: 'دليل',   line: 'تريد إعلانات تبيع؟' },
    'sv-winner':   { key: 'دليل',   line: 'تبحث عن منتج رابح؟' },

    'sv-confirm':  { key: 'إدارة',  line: 'تريد متابعة طلباتك ونسبة الرفض؟' },
    'sv-profit':   { key: 'إدارة',  line: 'تريد حساب أرباحك بدقّة؟' },
    'sv-report':   { key: 'إدارة',  line: 'تريد تقارير مبيعات منظّمة؟' },
    'sv-script':   { key: 'إدارة',  line: 'تريد تنظيم مكالماتك وطلباتك؟' },

    'sv-social':   { key: 'مربّعة', line: 'تريد صوراً احترافية لمنشوراتك؟' },
    'sv-content':  { key: 'ستوري',  line: 'تريد قوالب ستوري جاهزة؟' },
    'sv-comments': { key: 'مربّعة', line: 'تريد منشورات تجذب التفاعل؟' },
    'sv-reply':    { key: 'مربّعة', line: 'تريد محتوى جاهزاً لصفحتك؟' },

    'sv-naming':   { key: 'عروض',   line: 'تريد عرضاً تقديمياً لمشروعك؟' },
    'sv-logo':     { key: 'عروض',   line: 'تبني هويتك التجارية؟' }
  };

  var products = null;
  var shownFor = {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var dz = function (n) { return Number(n || 0).toLocaleString('ar-DZ') + ' دج'; };

  function load() {
    if (products) return Promise.resolve(products);
    return fetch(SB + '/rest/v1/digital_products' +
      '?select=id,title,subtitle,price_dzd,cover_url,slug' +
      '&status=eq.approved&seller_id=not.is.null&order=sort_order',
      { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (d) { products = d || []; return products; })
      .catch(function () { products = []; return products; });
  }

  function pick(key) {
    if (!products) return null;
    for (var i = 0; i < products.length; i++) {
      if (String(products[i].title || '').indexOf(key) >= 0) return products[i];
    }
    return null;
  }

  // نبني الاقتراح داخل شاشة الأداة، تحت النتيجة
  function build(screenId, cfg, p) {
    var scr = document.getElementById(screenId);
    if (!scr) return;
    var body = scr.querySelector('.svc-body') || scr;
    if (body.querySelector('.tj-sug')) return;

    var cover = p.cover_url
      ? '<img src="' + esc(p.cover_url) + '" alt="" style="width:64px;height:64px;' +
        'object-fit:cover;border-radius:11px;flex-shrink:0;">'
      : '<div style="width:64px;height:64px;border-radius:11px;flex-shrink:0;' +
        'background:linear-gradient(140deg,rgba(201,168,76,.28),rgba(201,168,76,.08));' +
        'display:flex;align-items:center;justify-content:center;font-size:26px;">📘</div>';

    var d = document.createElement('div');
    d.className = 'tj-sug';
    d.style.cssText = 'background:linear-gradient(160deg,rgba(201,168,76,.11),' +
      'rgba(255,255,255,.02));border:1px solid rgba(201,168,76,.28);' +
      'border-radius:14px;padding:14px;margin-top:18px;';
    d.innerHTML =
      '<div style="font-size:.78rem;color:var(--gold-l,#C9A84C);font-weight:700;' +
        'margin-bottom:10px;">💡 ' + esc(cfg.line) + '</div>' +
      '<div style="display:flex;gap:11px;align-items:center;">' +
        cover +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:.86rem;font-weight:700;line-height:1.4;">' +
            esc(p.title) + '</div>' +
          (p.subtitle ? '<div style="font-size:.7rem;opacity:.6;margin-top:2px;' +
            'line-height:1.5;">' + esc(p.subtitle) + '</div>' : '') +
          '<div style="font-size:.92rem;font-weight:800;color:var(--gold,#C9A84C);' +
            'margin-top:5px;">' + dz(p.price_dzd) + '</div>' +
        '</div>' +
      '</div>' +
      '<button class="tj-sug-btn" style="width:100%;background:var(--gold,#C9A84C);' +
        'color:#12151c;border:0;border-radius:10px;padding:11px;font-weight:800;' +
        'font-size:.85rem;margin-top:12px;cursor:pointer;font-family:inherit;">' +
        'شاهد التفاصيل</button>';

    body.appendChild(d);
    d.querySelector('.tj-sug-btn').addEventListener('click', function () {
      if (typeof window.mkOpenProduct === 'function') { window.mkOpenProduct(p.id); return; }
      if (typeof window.goFree === 'function') { window.goFree('products'); return; }
      location.href = '/s/yahia';
    });
  }

  // نراقب ظهور نتيجة في أي شاشة أداة
  function scan() {
    var ids = Object.keys(MATCH);
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      if (shownFor[id]) continue;
      var scr = document.getElementById(id);
      if (!scr) continue;
      // الشاشة ظاهرة؟
      var vis = scr.offsetParent !== null ||
        (scr.style.display && scr.style.display !== 'none');
      if (!vis) continue;
      // هل ظهرت نتيجة فعلاً؟ (صندوق نتيجة مرئي)
      var res = scr.querySelector('[id$="-res"], [id$="Result"], .result-box');
      var hasResult = res && res.offsetParent !== null;
      if (!hasResult) continue;

      shownFor[id] = 1;
      (function (sid, cfg) {
        load().then(function () {
          var p = pick(cfg.key);
          if (p) build(sid, cfg, p);
        });
      })(id, MATCH[id]);
    }
  }

  function boot() {
    load();
    setInterval(scan, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 1500); });
  } else { setTimeout(boot, 1500); }
})();
