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
          if (g.length) dpCache[String(p.title).trim()] = g;
        });
        return dpCache;
      })
      .catch(function () { dpCache = {}; return dpCache; });
  }

  function dpPaint(card, imgs) {
    if (card.__tjDp) return;
    var span = card.querySelector('span');
    if (!span) return;
    card.__tjDp = 1;

    var img = document.createElement('img');
    img.src = imgs[0];
    img.alt = '';
    img.loading = 'lazy';
    img.style.cssText = 'width:58px;height:58px;object-fit:cover;' +
      'border-radius:11px;flex-shrink:0;background:#1a1e27;display:block';
    // إن تعذّر تحميل الصورة نُرجع الرمز بدل مربّع فارغ
    img.onerror = function () { try { img.replaceWith(span); } catch (e) {} };
    span.replaceWith(img);

    if (imgs.length > 1) {
      var t = document.createElement('div');
      t.textContent = '📷 ' + imgs.length + ' صور';
      t.style.cssText = 'font-size:.63rem;color:#9aa0a6;margin-top:4px';
      if (img.parentNode) img.parentNode.appendChild(t);
    }
  }

  function dpScan() {
    var list = document.getElementById('shopList');
    if (!list || !list.children.length) return;
    dpLoad().then(function (map) {
      if (!map || !Object.keys(map).length) return;
      var cards = list.children;
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        if (c.__tjDp) continue;
        var nm = c.querySelector('div[style*="font-weight:700"]');
        if (!nm) continue;
        var imgs = map[nm.textContent.trim()];
        if (imgs && imgs.length) dpPaint(c, imgs);
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
