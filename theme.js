/* تاجر — تحديث المظهر + ترجمة الخدمات المضافة
   يعمل فوق الموقع بلا لمس index.html.
   لتعطيله: احذف سطر <script src="/theme.js"> */
(function () {
  'use strict';

  // ══════ 1) ترجمة الخدمات التي أضفناها لاحقاً ══════
  // البطاقات المستنسخة تفقد data-i18n، فنُترجمها هنا بأنفسنا.
  var T = {
    ar: {
      qr:   ['مولّد QR', 'رمز لمتجرك ومنتجاتك'],
      inv:  ['فاتورة احترافية', 'جاهزة للطباعة و PDF'],
      card: ['بطاقة منتج', 'صورة جاهزة للنشر'],
      trk:  ['تتبّع الطرود', 'ياليدين · نويست · علي إكسبريس'],
      shop: ['لوحة متجري', 'أرباحي · منتجاتي'],
      open: ['افتح متجرك وابدأ البيع', 'بِع منتجاتك واحتفظ بـ90%'],
      adm:  ['إدارة السوق', 'البائعون · المنتجات · التحويلات']
    },
    fr: {
      qr:   ['Générateur QR', 'Code pour votre boutique'],
      inv:  ['Facture pro', 'Prête à imprimer / PDF'],
      card: ['Fiche produit', 'Image prête à publier'],
      trk:  ['Suivi de colis', 'Yalidine · NOEST · AliExpress'],
      shop: ['Ma boutique', 'Revenus · Produits'],
      open: ['Ouvrez votre boutique', 'Vendez et gardez 90%'],
      adm:  ['Gestion du marché', 'Vendeurs · Produits · Paiements']
    },
    en: {
      qr:   ['QR Generator', 'Code for your store'],
      inv:  ['Pro Invoice', 'Ready to print / PDF'],
      card: ['Product Card', 'Ready-to-post image'],
      trk:  ['Parcel Tracking', 'Yalidine · NOEST · AliExpress'],
      shop: ['My Store', 'Earnings · Products'],
      open: ['Open your store', 'Sell and keep 90%'],
      adm:  ['Market Admin', 'Sellers · Products · Payouts']
    }
  };

  var MAP = {
    tjCardQr:  'qr',
    tjCardInv: 'inv',
    tjCardPc:  'card',
    tjCardTr:  'trk',
    mkAdminBtn:'adm'
  };

  function curLang() {
    var l = null;
    try { l = localStorage.getItem('tl'); } catch (e) {}
    return T[l] ? l : 'ar';
  }

  function translateCards() {
    var t = T[curLang()];
    Object.keys(MAP).forEach(function (id) {
      var c = document.getElementById(id);
      if (!c) return;
      var pair = t[MAP[id]];
      if (!pair) return;
      var nm = c.querySelector('.svc-name') || c.querySelector('.set-name');
      var sb = c.querySelector('.svc-sub')  || c.querySelector('.set-sub');
      if (nm) nm.textContent = pair[0];
      if (sb) sb.textContent = pair[1];
    });

    // زر المتجر: نصّه يختلف حسب كون المستخدم بائعاً
    var s = document.getElementById('mkSellerBtn');
    if (s) {
      var isSeller = /\/s\//.test(s.innerHTML);
      var pair = isSeller ? t.shop : t.open;
      var nm = s.querySelector('.set-name');
      if (nm) nm.textContent = pair[0];
      if (!isSeller) {
        var sb = s.querySelector('.set-sub');
        if (sb) sb.textContent = pair[1];
      }
    }
  }

  // نعترض تبديل اللغة لنترجم بطاقاتنا معه
  function hookLang() {
    if (window.__tjLangHooked) return;
    if (typeof window.applyLang !== 'function') return;
    window.__tjLangHooked = true;
    var orig = window.applyLang;
    window.applyLang = function (l) {
      var r = orig.apply(this, arguments);
      setTimeout(translateCards, 60);
      return r;
    };
  }

  // ══════ 2) تحديث المظهر ══════
  function injectCSS() {
    if (document.getElementById('tjTheme')) return;
    var st = document.createElement('style');
    st.id = 'tjTheme';
    st.textContent = [
      /* شارات «متاح» المكرّرة تشوّش البصر بلا فائدة */
      '.svc-card .free-tag{display:none!important}',

      /* حدود أرقّ وظلّ خفيف بدل الإطار الذهبي الصريح */
      '.svc-card{border-color:rgba(255,255,255,.07)!important;',
      'background:linear-gradient(160deg,rgba(255,255,255,.035),rgba(255,255,255,.012))!important;',
      'box-shadow:0 1px 2px rgba(0,0,0,.35)!important;',
      'padding:18px 12px 16px!important;',
      'transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease!important}',

      '.svc-card:active{transform:scale(.965)!important;',
      'border-color:rgba(201,168,76,.45)!important;',
      'box-shadow:0 0 0 1px rgba(201,168,76,.18)!important}',

      /* الأيقونة داخل قرص هادئ بدل رمز عائم */
      '.svc-card .svc-icon{width:46px;height:46px;margin:0 auto 10px!important;',
      'display:flex!important;align-items:center;justify-content:center;',
      'border-radius:14px;background:rgba(201,168,76,.09);',
      'font-size:22px!important;line-height:1!important}',

      /* تباين أفضل — النصّ الفرعي كان باهتاً جداً */
      '.svc-card .svc-name{font-size:.9rem!important;font-weight:700!important;',
      'letter-spacing:-.2px;margin-bottom:3px!important}',
      '.svc-card .svc-sub{font-size:.72rem!important;opacity:.62!important;line-height:1.55!important}',

      /* شارات PRO أهدأ */
      '.pro-tag,.pro-lock-tag{opacity:.85!important;font-size:.55rem!important;',
      'letter-spacing:.3px!important}',

      /* مسافة أوسع بين البطاقات */
      '.svc-grid{gap:11px!important}',

      /* عناوين الأقسام أوضح */
      '.sec-title{opacity:.75!important;letter-spacing:.8px!important;',
      'font-size:.74rem!important;margin-bottom:14px!important}',

      /* شريط التنقّل السفلي: حدّ أرقّ */
      '.tabbar,.bottom-nav{border-top-color:rgba(255,255,255,.06)!important}'
    ].join('');
    document.head.appendChild(st);
  }

  // ══════ 3) أيقونات خطّية بدل الرموز التعبيرية ══════
  // نحتفظ بالرمز نفسه لكن نحيّده لونياً ليبدو جزءاً من الهوية
  function calmIcons() {
    var cards = document.querySelectorAll('.svc-card .svc-icon');
    for (var i = 0; i < cards.length; i++) {
      var el = cards[i];
      if (el.__tj) continue;
      el.__tj = 1;
      // ترشيح خفيف: يوحّد ألوان الرموز مع هوية الموقع
      el.style.filter = 'saturate(.75) brightness(1.05)';
    }
  }


  // ══════ 4) صور المنتجات في شاشة «المنتجات الرقمية» ══════
  // الشاشة مبنيّة داخل app.js وتعرض الرمز فقط، فنستبدله بالغلاف.
  var DPFN  = 'https://rnaqsvmtszxgbvzaagzx.supabase.co/functions/v1/digital-products';
  var DPKEY = 'sb_publishable_ly90vH9XsCT_05kxQenomw_LE5aCud-';
  var dpCache = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }


  function dpLoad() {
    if (dpCache) return Promise.resolve(dpCache);
    return fetch(DPFN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: DPKEY,
                 Authorization: 'Bearer ' + DPKEY },
      body: JSON.stringify({ action: 'list' })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        dpCache = {};
        ((d && d.products) || []).forEach(function (p) {
          var g = Array.isArray(p.gallery) ? p.gallery : [];
          if (!g.length && p.cover_url) g = [p.cover_url];
          dpCache[String(p.title).trim()] = { imgs: g, p: p };
        });
        return dpCache;
      })
      .catch(function () { dpCache = {}; return dpCache; });
  }

  // نحوّل البطاقة إلى شكل متجر: غلاف كبير أعلى، ثم الاسم والسعر
  function dpPaint(card, rec) {
    if (card.__tjDp) return;
    var imgs = rec.imgs || [];
    if (!imgs.length) return;
    card.__tjDp = 1;

    // الرمز الصغير لم يعد مطلوباً — الغلاف يحلّ محلّه
    // الرمز قد يُكتب بمسافات مختلفة، فنبحث عن أول span في البطاقة
    var span = card.querySelector('span');
    if (span && !span.className) span.style.display = 'none';

    var cover = document.createElement('div');
    cover.className = 'tj-cover';
    cover.innerHTML =
      '<img src="' + esc(imgs[0]) + '" alt="" loading="lazy">' +
      (imgs.length > 1
        ? '<span class="tj-count">📷 ' + imgs.length + '</span>'
        : '');
    cover.addEventListener('click', function (e) {
      e.stopPropagation();
      dpModal(rec);
    });
    card.insertBefore(cover, card.firstChild);
  }

  function dpGridCSS() {
    if (document.getElementById('tjDpCss')) return;
    var st = document.createElement('style');
    st.id = 'tjDpCss';
    st.textContent =
      /* شبكة بعمودين على الهاتف */
      '#shopList{display:grid;grid-template-columns:repeat(2,1fr);gap:11px}' +
      '#shopList>div{margin-bottom:0!important;padding:0!important;overflow:hidden;' +
        'display:flex;flex-direction:column}' +
      '@media(min-width:620px){#shopList{grid-template-columns:repeat(3,1fr)}}' +

      /* الغلاف */
      '.tj-cover{position:relative;width:100%;aspect-ratio:1;background:#1a1e27;' +
        'cursor:pointer;flex-shrink:0}' +
      '.tj-cover img{width:100%;height:100%;object-fit:cover;display:block}' +
      '.tj-count{position:absolute;bottom:6px;inset-inline-start:6px;' +
        'background:rgba(0,0,0,.72);color:#fff;font-size:.6rem;padding:2px 7px;' +
        'border-radius:20px}' +

      /* المحتوى تحت الغلاف */
      '#shopList>div>div:not(.tj-cover){padding:0 10px}' +
      '#shopList>div>div:first-of-type{padding-top:10px}' +
      '#shopList .tj-see{margin:8px 10px 0!important;width:calc(100% - 20px)!important}' +
      '#shopList>div>div:last-child{padding-bottom:10px;margin-top:auto}' +

      /* نصوص أصغر تناسب العمودين */
      '#shopList div[style*="font-weight:700"]{font-size:.82rem!important;' +
        'line-height:1.45!important}' +
      /* البطاقة تعرض: الغلاف · الاسم · معاينة · السعر — لا أكثر.
         الوصف والتفاصيل تظهر داخل نافذة المعاينة. */
      '#shopList div[style*="white-space:pre-line"]{display:none!important}' +
      /* صندوق «ماذا يحتوي» */
      '#shopList div[style*="border-radius:10px"][style*="padding:10px 12px"]' +
        '{display:none!important}' +
      /* الوصف الفرعي تحت الاسم */
      '#shopList div[style*="font-size:.76rem"][style*="margin-top:2px"]' +
        '{display:none!important}' +
      /* شارات الصيغة وعدد الصفحات */
      '#shopList div[style*="flex-wrap:wrap"]{display:none!important}' +
      /* رابط المعاينة القديم — استبدله زرّنا */
      '#shopList a[target="_blank"]{display:none!important}';
    document.head.appendChild(st);
  }

  // زرّ يفتح معرض الصور والشرح الكامل قبل الشراء
  function dpAddBtn(card, rec) {
    if (card.__tjBtn) return;
    if (!rec.imgs || !rec.imgs.length) return;
    card.__tjBtn = 1;

    var b = document.createElement('button');
    b.className = 'tj-see';
    b.textContent = '👁️ معاينة';
    b.style.cssText = 'width:100%;background:rgba(201,168,76,.12);' +
      'border:1px solid rgba(201,168,76,.35);border-radius:10px;padding:10px;' +
      'margin-top:10px;font-size:.8rem;font-weight:600;color:#C9A84C;' +
      'cursor:pointer;font-family:inherit';
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      dpModal(rec);
    });

    // نضعه قبل صفّ السعر ليبقى الشراء آخر ما يراه
    var rows = card.querySelectorAll('div[style*="justify-content:space-between"]');
    var last = rows[rows.length - 1];
    if (last && last.parentNode === card) card.insertBefore(b, last);
    else card.appendChild(b);
  }

  function dpModal(rec) {
    var p = rec.p || {};
    var imgs = rec.imgs || [];
    var old = document.getElementById('tjDpModal');
    if (old) old.remove();

    var m = document.createElement('div');
    m.id = 'tjDpModal';
    m.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(8,10,14,.96);' +
      'overflow-y:auto;padding:14px;font-family:inherit';

    var strip = imgs.map(function (u, i) {
      return '<div style="position:relative;margin-bottom:9px">' +
        '<img src="' + esc(u) + '" alt="" loading="lazy" ' +
        'style="width:100%;border-radius:12px;display:block;background:#1a1e27" ' +
        'onerror="this.parentNode.style.display=\'none\'">' +
        (i === 0
          ? '<span style="position:absolute;top:8px;inset-inline-start:8px;' +
            'background:#C9A84C;color:#12151c;font-size:.6rem;font-weight:800;' +
            'padding:3px 9px;border-radius:20px">الغلاف</span>'
          : '') +
        '</div>';
    }).join('');

    var chips = '';
    if (p.format) chips += '<span class="tj-chip">📄 ' + esc(p.format) + '</span>';
    if (p.pages)  chips += '<span class="tj-chip">' + esc(p.pages) + '</span>';
    if (p.file_size) chips += '<span class="tj-chip">' + esc(p.file_size) + '</span>';

    var contents = '';
    if (p.contents) {
      contents = '<div style="background:rgba(255,255,255,.04);border:1px solid ' +
        'rgba(255,255,255,.09);border-radius:11px;padding:12px;margin-top:12px">' +
        '<div style="font-size:.75rem;color:#C9A84C;font-weight:700;margin-bottom:7px">' +
        'ماذا يحتوي</div>' +
        String(p.contents).split('\n').filter(function (x) { return x.trim(); })
          .map(function (x) {
            return '<div style="font-size:.78rem;color:#c8ccd2;line-height:1.9">✓ ' +
              esc(x.trim()) + '</div>';
          }).join('') + '</div>';
    }

    m.innerHTML =
      '<style>.tj-chip{font-size:.68rem;background:rgba(255,255,255,.07);' +
        'border:1px solid rgba(255,255,255,.12);padding:4px 10px;border-radius:20px;' +
        'color:#9aa0a6;margin-inline-end:6px;display:inline-block;margin-bottom:6px}</style>' +
      '<div style="max-width:460px;margin:0 auto;color:#e8eaed">' +
        '<button id="tjDpX" style="position:sticky;top:0;float:inline-end;' +
          'background:rgba(0,0,0,.7);color:#fff;border:0;border-radius:50%;' +
          'width:34px;height:34px;font-size:1.1rem;cursor:pointer;' +
          'font-family:inherit;z-index:2">✕</button>' +
        '<div style="clear:both;padding-top:6px">' +
          '<h2 style="font-size:1.05rem;margin:0 0 4px;line-height:1.5">' +
            esc(p.title || '') + '</h2>' +
          (p.subtitle ? '<div style="font-size:.8rem;color:#9aa0a6;margin-bottom:10px">' +
            esc(p.subtitle) + '</div>' : '') +
          (chips ? '<div style="margin-bottom:12px">' + chips + '</div>' : '') +
          strip +
          (p.description ? '<div style="font-size:.82rem;color:#c8ccd2;line-height:1.9;' +
            'white-space:pre-line;margin-top:12px">' + esc(p.description) + '</div>' : '') +
          contents +
          '<div style="height:14px"></div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(m);
    document.body.style.overflow = 'hidden';
    var close = function () {
      m.remove();
      document.body.style.overflow = '';
    };
    m.querySelector('#tjDpX').addEventListener('click', close);
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
  }

  function dpScan() {
    var list = document.getElementById('shopList');
    if (!list || !list.children.length) return;
    dpGridCSS();
    dpLoad().then(function (map) {
      if (!map || !Object.keys(map).length) return;
      var cards = list.children;
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        // لا نتخطّى بعد رسم الصورة — الزرّ له حارسه الخاص
        if (c.__tjDp && c.__tjBtn) continue;
        var nm = c.querySelector('div[style*="font-weight:700"]');
        if (!nm) continue;
        var rec = map[nm.textContent.trim()];
        if (!rec) continue;
        if (rec.imgs && rec.imgs.length) dpPaint(c, rec);
        dpAddBtn(c, rec);
      }
    });
  }

  function run() {
    try { injectCSS(); } catch (e) {}
    try { calmIcons(); } catch (e) {}
    try { hookLang(); } catch (e) {}
    try { translateCards(); } catch (e) {}
    try { dpScan(); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else { run(); }

  // البطاقات تُضاف بعد التحميل، فنعيد المحاولة
  [400, 1200, 2500, 4500, 7000].forEach(function (ms) { setTimeout(run, ms); });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) run();
  });
})();
