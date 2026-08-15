/* تاجر — إصلاح أداة إزالة الخلفية (ملف مستقل)
   يستبدل runBgRemove بنسخة تجلب ملفات النموذج من jsdelivr
   بدل staticimgly الذي يفشل مع خطأ publicPath.
   لتعطيله: احذف سطر <script src="/bgfix.js"> من index.html */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- إصلاح أداة إزالة الخلفية ----------
  // الخطأ: no available backend found ... publicPath
  // السبب: المكتبة تجلب ملفات onnxruntime‏ (.wasm) من staticimgly.com
  // وتفشل. الحل: نستعمل الإصدار 1.4.5 الذي تتوفّر بياناته على jsdelivr
  // (نفس المصدر الذي تُحمَّل منه المكتبة أصلاً وهو يعمل).
  // نعيد تعريف runBgRemove هنا لأن market.js يُحمَّل بعد app.js.
  var BG_LIB = [
    'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/index.mjs',
    'https://unpkg.com/@imgly/background-removal@1.4.5/dist/index.mjs',
    'https://esm.sh/@imgly/background-removal@1.4.5'
  ];
  var BG_DATA = [
    'https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@1.4.5/dist/',
    'https://unpkg.com/@imgly/background-removal-data@1.4.5/dist/'
  ];

  function el(id) { return document.getElementById(id); }

  async function bgRemove() {
    var input = el('bgInput');
    var file = input && input.files && input.files[0];
    if (!file) {
      if (typeof window.showToast === 'function') window.showToast('⚠️ اختر صورة أولاً');
      return;
    }
    var loadEl = el('bg-load'), errEl = el('bg-err'),
        resEl = el('bg-res'), btnEl = el('bg-btn'), txtEl = el('bgLoadText');

    if (loadEl) loadEl.style.display = 'block';
    if (errEl)  errEl.style.display = 'none';
    if (resEl)  resEl.style.display = 'none';
    if (btnEl)  btnEl.style.display = 'none';

    try {
      if (typeof window.consumeUse === 'function') await window.consumeUse();

      if (txtEl) txtEl.textContent = 'جارٍ تجهيز الصورة...';
      var img = (typeof window.resizeImageFile === 'function')
        ? await window.resizeImageFile(file, 1024) : file;

      if (txtEl) txtEl.textContent = 'جارٍ تحميل الذكاء الاصطناعي... (المرة الأولى قد تأخذ دقيقة)';
      var removeBackground = null, lastErr = null;
      for (var i = 0; i < BG_LIB.length; i++) {
        try {
          var mod = await import(BG_LIB[i]);
          removeBackground = mod.removeBackground ||
                             (mod.default && mod.default.removeBackground);
          if (removeBackground) break;
        } catch (e1) { lastErr = e1; }
      }
      if (!removeBackground) {
        throw new Error('تعذّر تحميل المكتبة. جرّب شبكة أخرى. ' + String(lastErr).slice(0, 90));
      }

      if (txtEl) txtEl.textContent = 'جارٍ إزالة الخلفية... (قد تأخذ 30-60 ثانية)';
      var blob = null, dataErr = null;
      // نجرّب كل مصادر ملفات النموذج حتى ينجح واحد
      for (var j = 0; j < BG_DATA.length; j++) {
        try {
          blob = await removeBackground(img, {
            publicPath: BG_DATA[j],
            model: 'medium',
            progress: function (key, cur, total) {
              if (!txtEl || !total) return;
              if (String(key).indexOf('fetch') === 0) {
                txtEl.textContent = 'جارٍ تحميل النموذج ' +
                  Math.round((cur / total) * 100) + '%';
              }
            }
          });
          if (blob) break;
        } catch (e2) { dataErr = e2; }
      }
      if (!blob) throw dataErr || new Error('تعذّرت المعالجة');

      var url = URL.createObjectURL(blob);
      var r = el('bgResult'), d = el('bgDownload');
      if (r) r.src = url;
      if (d) d.href = url;
      if (resEl) resEl.style.display = 'block';
      if (typeof window.saveHist === 'function') {
        window.saveHist('🗑️ إزالة الخلفية', 'تمت إزالة خلفية صورة بنجاح');
      }
    } catch (e) {
      var m = String(e && e.message ? e.message : e);
      if ((m === 'LOGIN_REQUIRED' || m === 'LIMIT_REACHED') &&
          typeof window.handleAiError === 'function') {
        window.handleAiError(e, errEl);
      } else if (errEl) {
        errEl.innerHTML = '❌ <span style="font-size:.72rem;font-family:monospace;' +
          'direction:ltr;display:inline-block;word-break:break-all;">' +
          esc(m.slice(0, 200)) + '</span>';
        errEl.style.display = 'block';
      }
      if (btnEl) btnEl.style.display = 'block';
    } finally {
      if (loadEl) loadEl.style.display = 'none';
      if (txtEl) txtEl.textContent = 'جارٍ تحميل الذكاء الاصطناعي... (المرة الأولى قد تأخذ دقيقة)';
    }
  }

  // نستبدل نسخة app.js بعد تحميلها
  function patchBg() {
    if (!document.getElementById('bgInput')) return;
    window.runBgRemove = bgRemove;
  }

  function boot() {
    try { patchBg(); } catch (e) {}
    [800, 2500, 5000].forEach(function (ms) {
      setTimeout(function () { try { patchBg(); } catch (e) {} }, ms);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
