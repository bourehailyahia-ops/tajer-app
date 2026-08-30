/* تاجر — رفع الصور والملف في لوحة المالك
   لوحة المالك تبني نموذج التعديل داخل app.js الذي يصعب تعديله،
   فنعترض الدالّة ونُضيف صناديق الرفع بعد بنائها.
   يعتمد على upload.js في التصغير والرفع.
   لتعطيله: احذف سطر <script src="/adminup.js"> من index.html */
(function () {
  'use strict';

  var SB  = 'https://rnaqsvmtszxgbvzaagzx.supabase.co';
  var KEY = 'sb_publishable_ly90vH9XsCT_05kxQenomw_LE5aCud-';

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function sess() {
    try { return JSON.parse(localStorage.getItem('tajer_session') || 'null'); }
    catch (e) { return null; }
  }


  // نرفع بأنفسنا بدل الاعتماد على upload.js — فهو مبنيّ للوحة البائع
  // وقد لا يعمل هنا، وكان فشله صامتاً يُظهر نجاحاً كاذباً.
  var safeName = function (n) {
    return String(n).replace(/[^\w.\-]+/g, '_').slice(-60);
  };

  function shrink(f, max) {
    max = max || 1400;
    return new Promise(function (resolve) {
      try {
        var fr = new FileReader();
        fr.onerror = function () { resolve(f); };
        fr.onload = function () {
          var im = new Image();
          im.onerror = function () { resolve(f); };
          im.onload = function () {
            var w = im.width, h = im.height;
            if (w <= max && h <= max && f.size < 400000) return resolve(f);
            if (w > h) { h = Math.round(h * max / w); w = max; }
            else { w = Math.round(w * max / h); h = max; }
            var cv = document.createElement('canvas');
            cv.width = w; cv.height = h;
            cv.getContext('2d').drawImage(im, 0, 0, w, h);
            cv.toBlob(function (b) {
              resolve(b && b.size < f.size ? b : f);
            }, 'image/jpeg', 0.85);
          };
          im.src = fr.result;
        };
        fr.readAsDataURL(f);
      } catch (e) { resolve(f); }
    });
  }

  function putFile(bucket, path, blob, type, tok) {
    return fetch(SB + '/storage/v1/object/' + bucket + '/' + encodeURI(path), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + tok, apikey: KEY,
        'Content-Type': type || 'application/octet-stream',
        'x-upsert': 'false'
      },
      body: blob
    }).then(function (r) {
      if (r.ok) return true;
      return r.json().catch(function () { return {}; }).then(function (d) {
        throw new Error(d.message || d.error || ('رمز ' + r.status));
      });
    });
  }

  var pubUrl = function (bucket, path) {
    return SB + '/storage/v1/object/public/' + bucket + '/' + encodeURI(path);
  };

  async function uploadImgs(uid, files, tok, onPct) {
    var urls = [];
    for (var i = 0; i < files.length; i++) {
      var blob = await shrink(files[i]);
      var path = uid + '/' + Date.now() + '_a' + i + '_' + safeName(files[i].name);
      await putFile('product-images', path, blob, blob.type || 'image/jpeg', tok);
      urls.push(pubUrl('product-images', path));
      if (onPct) onPct(Math.round(((i + 1) / files.length) * 100));
    }
    return urls;
  }

  async function uploadOne(uid, file, tok) {
    var path = uid + '/' + Date.now() + '_' + safeName(file.name);
    await putFile('product-files', path, file,
      file.type || 'application/octet-stream', tok);
    return path;
  }

  var gallery = [];    // الصور الحالية
  var newImgs = [];    // {file,url}
  var newFile = null;
  var curId = null;

  // ── الأنماط ──
  function css() {
    if ($('tjAdUpCss')) return;
    var st = document.createElement('style');
    st.id = 'tjAdUpCss';
    st.textContent =
      '.tj-up{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.09);' +
        'border-radius:12px;padding:13px;margin-top:13px}' +
      '.tj-up-t{font-size:.84rem;font-weight:700;margin-bottom:3px}' +
      '.tj-up-s{font-size:.71rem;opacity:.6;line-height:1.6}' +
      '.tj-up-b{display:block;text-align:center;border:1.5px dashed rgba(255,255,255,.15);' +
        'border-radius:10px;padding:13px;margin-top:9px;cursor:pointer;font-size:.84rem}' +
      '.tj-up-b:active{opacity:.6}' +
      '.tj-g{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:9px}' +
      '.tj-c{position:relative;aspect-ratio:1;border-radius:9px;overflow:hidden;' +
        'border:1px solid rgba(255,255,255,.12)}' +
      '.tj-c img{width:100%;height:100%;object-fit:cover;display:block}' +
      '.tj-x{position:absolute;top:3px;inset-inline-end:3px;background:rgba(0,0,0,.75);' +
        'color:#fff;border:0;border-radius:50%;width:21px;height:21px;cursor:pointer;' +
        'font-size:.7rem;line-height:1;font-family:inherit}' +
      '.tj-cov{position:absolute;bottom:0;inset-inline:0;background:#C9A84C;color:#12151c;' +
        'font-size:.55rem;font-weight:800;text-align:center;padding:3px}' +
      '.tj-is-cov{border-color:#C9A84C!important;box-shadow:0 0 0 2px rgba(201,168,76,.35)}' +
      '.tj-mk{position:absolute;bottom:0;inset-inline:0;background:rgba(0,0,0,.72);' +
        'color:#fff;border:0;font-size:.52rem;padding:4px 2px;cursor:pointer;' +
        'font-family:inherit;width:100%}' +
      '.tj-bar{height:5px;background:rgba(255,255,255,.1);border-radius:99px;' +
        'overflow:hidden;margin-top:8px;display:none}' +
      '.tj-bar.on{display:block}' +
      '.tj-fill{height:100%;width:0;background:#C9A84C;transition:width .25s}';
    document.head.appendChild(st);
  }

  // ── بناء الصناديق داخل النموذج ──
  function inject(p) {
    var anchor = $('dpPreview');
    if (!anchor) return;
    var host = anchor.parentNode;
    if (host.querySelector('.tj-up')) return;

    gallery = (p && Array.isArray(p.gallery)) ? p.gallery.slice() : [];
    if (!gallery.length && p && p.cover_url) gallery = [p.cover_url];
    newImgs = []; newFile = null;
    curId = (p && p.id) || null;

    var box = document.createElement('div');
    box.innerHTML =
      '<div class="tj-up">' +
        '<div class="tj-up-t">🖼️ صور المنتج</div>' +
        '<div class="tj-up-s">الصورة المحاطة بإطار ذهبي هي <b>الغلاف</b> — ' +
          'وهي ما يراه المشتري في المتجر. اضغط «اجعلها الغلاف» على أي صورة لتبديلها. ' +
          'حتى 6 صور.</div>' +
        '<div id="tjNow" class="tj-g"></div>' +
        '<label class="tj-up-b"><input type="file" id="tjImgs" accept="image/*" multiple hidden>' +
          '📷 اختر صوراً</label>' +
        '<div id="tjNew" class="tj-g"></div>' +
        '<div id="tjNote" class="tj-up-s" style="margin-top:7px"></div>' +
        '<div id="tjIBar" class="tj-bar"><div id="tjIFill" class="tj-fill"></div></div>' +
      '</div>' +
      '<div class="tj-up">' +
        '<div class="tj-up-t">📦 ملف المنتج</div>' +
        '<div id="tjFNow" class="tj-up-s"></div>' +
        '<label class="tj-up-b"><input type="file" id="tjFile" hidden>' +
          '📎 ' + (p && (p.file_path || p.file_url) ? 'استبدل الملف' : 'ارفع الملف') + '</label>' +
        '<div id="tjFName" class="tj-up-s" style="margin-top:7px"></div>' +
        '<div id="tjFBar" class="tj-bar"><div id="tjFFill" class="tj-fill"></div></div>' +
      '</div>';
    host.insertBefore(box, anchor.nextSibling);

    $('tjFNow').innerHTML = (p && (p.file_path || p.file_url))
      ? '<span style="color:#2ECC71">✓ يوجد ملف مرفوع</span>'
      : '<span style="color:#E74C3C">⚠️ لا ملف — المشتري لن يستطيع التحميل</span>';

    drawNow(); bind();
  }

  function drawNow() {
    var b = $('tjNow');
    if (!b) return;
    b.innerHTML = gallery.length ? gallery.map(function (u, i) {
      return '<div class="tj-c' + (i === 0 ? ' tj-is-cov' : '') + '">' +
        '<img src="' + esc(u) + '">' +
        '<button class="tj-x" onclick="tjAdRmOld(' + i + ')">✕</button>' +
        (i === 0
          ? '<div class="tj-cov">★ الغلاف</div>'
          : '<button class="tj-mk" onclick="tjAdSetCov(' + i + ')">' +
            'اجعلها الغلاف</button>') +
        '</div>';
    }).join('') : '<div class="tj-up-s">لا صور بعد.</div>';
  }

  // نقل صورة إلى المقدّمة لتصبح الغلاف
  window.tjAdSetCov = function (i) {
    if (i <= 0 || i >= gallery.length) return;
    var u = gallery.splice(i, 1)[0];
    gallery.unshift(u);
    drawNow();
  };
  window.tjAdRmOld = function (i) { gallery.splice(i, 1); drawNow(); };

  function drawNew() {
    var b = $('tjNew');
    if (!b) return;
    b.innerHTML = newImgs.map(function (p, i) {
      return '<div class="tj-c"><img src="' + p.url + '">' +
        '<button class="tj-x" onclick="tjAdRmNew(' + i + ')">✕</button></div>';
    }).join('');
  }
  window.tjAdRmNew = function (i) {
    try { URL.revokeObjectURL(newImgs[i].url); } catch (e) {}
    newImgs.splice(i, 1); drawNew();
  };

  function bind() {
    var im = $('tjImgs'), fl = $('tjFile');
    // الحماية من تكرار المستمع: bind تُستدعى كلما فُتحت النافذة،
    // وبلا هذا الحارس يُسجَّل مستمع جديد كل مرة فتضيع الملفات.
    if (im && !im.__tjBound) {
      im.__tjBound = 1;
      im.addEventListener('change', function () {
      var list = Array.prototype.slice.call(im.files || []);
      var room = 6 - (gallery.length + newImgs.length);
      var skipped = 0;
      for (var i = 0; i < list.length; i++) {
        if (newImgs.length + gallery.length >= 6) { skipped++; continue; }
        if (String(list[i].type).indexOf('image/') !== 0) { skipped++; continue; }
        if (list[i].size > 8 * 1024 * 1024) { skipped++; continue; }
        newImgs.push({ file: list[i], url: URL.createObjectURL(list[i]) });
      }
      im.value = ''; drawNew();
      var n = $('tjNote');
      if (n) {
        n.textContent = skipped
          ? ('أُضيفت ' + newImgs.length + ' — تُجوهلت ' + skipped +
             ' (الحد 6 صور، وحتى 8 م.ب للصورة)')
          : (newImgs.length ? ('أُضيفت ' + newImgs.length + ' صورة جديدة') : '');
      }
      });
    }
    if (fl && !fl.__tjBound) {
      fl.__tjBound = 1;
      fl.addEventListener('change', function () {
      var f = fl.files && fl.files[0];
      if (!f) return;
      if (f.size > 50 * 1024 * 1024) {
        $('tjFName').innerHTML = '<span style="color:#E74C3C">الملف أكبر من 50 م.ب</span>';
        fl.value = ''; return;
      }
      newFile = f;
      $('tjFName').innerHTML = '✓ ' + esc(f.name.slice(0, 34)) +
        ' (' + (f.size / 1048576).toFixed(1) + ' م.ب)';
      });
    }
  }

  // ── اعتراض فتح النموذج ──
  function hookEdit() {
    if (window.__tjAdHooked) return;
    if (typeof window.editProduct !== 'function') return;
    window.__tjAdHooked = true;
    var orig = window.editProduct;
    window.editProduct = function (p) {
      var r = orig.apply(this, arguments);
      css();
      setTimeout(function () { try { inject(p); } catch (e) {} }, 80);
      return r;
    };
  }

  // ── اعتراض الحفظ ──
  // saveProduct مُعرَّفة داخل app.js كـ async function، وقد لا تكون
  // على window وقت التحميل. فنربط الرفع بزرّ الحفظ نفسه لضمان العمل.
  function hookSave() {
    // نربط الزرّ دائماً — لا نكتفي باعتراض window.saveProduct لأن الزرّ
    // في app.js يستدعي النسخة الداخلية لا المعترَضة، فيفشل الاعتراض صامتاً.
    var btns = document.querySelectorAll('[onclick*="saveProduct"]');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].__tjB) continue;
      btns[i].__tjB = 1;
      btns[i].addEventListener('click', function () {
        var pending = newImgs.length || newFile;
        if (!pending) return;
        var n = $('tjNote');
        if (n) n.textContent = '⏳ جارٍ رفع الصور…';
        // نمهل الحفظ الأصلي ثم نرفع
        setTimeout(function () {
          afterSave().then(function () {
            if (n) n.textContent = '✓ رُفعت الصور';
          }).catch(function (e) {
            if (n) n.textContent = '❌ ' + String(e.message || e).slice(0, 80);
            console.warn('tj upload:', e);
          });
        }, 1100);
      });
    }
  }

  async function afterSave() {
    if (!newImgs.length && !newFile && !curId) return;
    var s = sess();
    var uid = s && s.user && s.user.id;
    var tok = s && s.access_token;
    if (!uid || !tok) throw new Error('سجّل الدخول أولاً');

    var patch = {};
    if (newImgs.length) {
      var bar = $('tjIBar'); if (bar) bar.classList.add('on');
      var added = await uploadImgs(uid,
        newImgs.map(function (x) { return x.file; }), tok,
        function (pct) { var f = $('tjIFill'); if (f) f.style.width = pct + '%'; });
      var all = gallery.concat(added).slice(0, 6);
      patch.gallery = all;
      patch.cover_url = all[0] || null;
    } else if (curId) {
      patch.gallery = gallery;
      patch.cover_url = gallery[0] || null;
    }

    if (newFile) {
      var fb = $('tjFBar'); if (fb) fb.classList.add('on');
      var ff = $('tjFFill'); if (ff) ff.style.width = '45%';
      patch.file_path = await uploadOne(uid, newFile, tok);
      patch.file_size = (newFile.size / 1048576).toFixed(1) + ' MB';
      if (ff) ff.style.width = '100%';
    }

    if (!Object.keys(patch).length) throw new Error('لا يوجد ما يُحفظ');

    // نحتاج معرّف المنتج: إن كان جديداً نأخذ الأحدث لهذا البائع
    var idEl = $('dpId');
    var id = (idEl && idEl.value && idEl.value.trim()) || curId;
    if (!id) {
      var q = await fetch(SB + '/rest/v1/digital_products' +
        '?select=id&order=created_at.desc&limit=1',
        { headers: { apikey: KEY, Authorization: 'Bearer ' + tok } });
      var rows = await q.json().catch(function () { return []; });
      id = rows && rows[0] && rows[0].id;
    }
    if (!id) throw new Error('تعذّر تحديد المنتج');

    // نفحص النتيجة: بدون ذلك يفشل الربط صامتاً ولا يعرف أحد.
    // نطلب return=representation لنتأكّد أن صفاً تغيّر فعلاً.
    var r = await fetch(SB + '/rest/v1/digital_products?id=eq.' +
      encodeURIComponent(id) + '&select=id,cover_url', {
      method: 'PATCH',
      headers: {
        apikey: KEY, Authorization: 'Bearer ' + tok,
        'Content-Type': 'application/json', Prefer: 'return=representation'
      },
      body: JSON.stringify(patch)
    });

    if (!r.ok) {
      var err = await r.json().catch(function () { return {}; });
      throw new Error('رفض الحفظ (' + r.status + '): ' +
        (err.message || err.hint || err.code || 'سبب غير معروف'));
    }

    var rows = await r.json().catch(function () { return []; });
    if (!rows || !rows.length) {
      throw new Error('لم يتغيّر أي منتج — تحقّق أن المعرّف صحيح: ' +
        String(id).slice(0, 12));
    }

    newImgs = []; newFile = null;
  }

  function run() {
    try { hookEdit(); } catch (e) {}
    try { hookSave(); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else { run(); }
  [600, 1800, 3500, 6000].forEach(function (ms) { setTimeout(run, ms); });
  setInterval(run, 2000);
})();
