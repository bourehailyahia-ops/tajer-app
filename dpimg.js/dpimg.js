/* تاجر — عرض صور المنتجات في شاشة «المنتجات الرقمية»
   الشاشة مبنيّة داخل app.js وتعرض الرمز فقط، ولا تعرف بوجود الصور.
   نستبدل الرمز بالغلاف بعد رسم القائمة.
   لتعطيله: احذف سطر <script src="/dpimg.js"> من index.html */
(function () {
  'use strict';

  var FN  = 'https://rnaqsvmtszxgbvzaagzx.supabase.co/functions/v1/digital-products';
  var KEY = 'sb_publishable_ly90vH9XsCT_05kxQenomw_LE5aCud-';

  var cache = null;   // { title -> {cover, gallery} }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function load() {
    if (cache) return Promise.resolve(cache);
    return fetch(FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY,
                 Authorization: 'Bearer ' + KEY },
      body: JSON.stringify({ action: 'list' })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        cache = {};
        (d && d.products || []).forEach(function (p) {
          var g = Array.isArray(p.gallery) ? p.gallery : [];
          if (!g.length && p.cover_url) g = [p.cover_url];
          if (g.length) cache[String(p.title).trim()] = g;
        });
        return cache;
      })
      .catch(function () { cache = {}; return cache; });
  }

  // نستبدل الرمز بصورة داخل بطاقة المنتج
  function paint(card, imgs) {
    if (card.__tjImg) return;
    var span = card.querySelector('span');
    if (!span) return;
    card.__tjImg = 1;

    var img = document.createElement('img');
    img.src = imgs[0];
    img.alt = '';
    img.loading = 'lazy';
    img.style.cssText = 'width:58px;height:58px;object-fit:cover;border-radius:11px;' +
      'flex-shrink:0;background:#1a1e27;display:block';
    img.onerror = function () {
      // إن تعذّر تحميل الصورة نُرجع الرمز بدل مربّع فارغ
      img.replaceWith(span);
    };
    span.replaceWith(img);

    if (imgs.length > 1) {
      var t = document.createElement('div');
      t.textContent = '📷 ' + imgs.length + ' صور';
      t.style.cssText = 'font-size:.63rem;color:#9aa0a6;margin-top:4px';
      var box = img.parentNode;
      if (box) box.appendChild(t);
    }
  }

  function scan() {
    var list = document.getElementById('shopList');
    if (!list || !list.children.length) return;
    load().then(function (map) {
      if (!map || !Object.keys(map).length) return;
      var cards = list.children;
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        if (c.__tjImg) continue;
        var nm = c.querySelector('div[style*="font-weight:700"]');
        if (!nm) continue;
        var imgs = map[nm.textContent.trim()];
        if (imgs && imgs.length) paint(c, imgs);
      }
    });
  }

  function boot() {
    scan();
    setInterval(scan, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 1200); });
  } else { setTimeout(boot, 1200); }
})();
