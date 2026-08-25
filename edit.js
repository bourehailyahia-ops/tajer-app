/* تاجر — تعديل المنتجات مع رفع الصور والملف
   منفصل عن اللوحة لتبقى الملفات صغيرة وقابلة للنقل من الهاتف.
   يعتمد على upload.js في رفع الملفات وتصغير الصور.
   لتعطيله: احذف سطر <script src="/edit.js"> من seller-dashboard.html */
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
  function note(id, t, k) {
    var el = $(id);
    if (el) el.innerHTML = t ? '<div class="msg ' + (k || 'err') + '">' + esc(t) + '</div>' : '';
  }
  function sess() {
    try { return JSON.parse(localStorage.getItem('tajer_session') || 'null'); }
    catch (e) { return null; }
  }
  function token() { var s = sess(); return s && s.access_token; }

  function rest(path, opts) {
    var t = token();
    var o = opts || {};
    o.headers = Object.assign({
      apikey: KEY, Authorization: 'Bearer ' + (t || KEY),
      'Content-Type': 'application/json'
    }, o.headers || {});
    return fetch(SB + '/rest/v1/' + path, o);
  }

  var cur = null;        // المنتج المفتوح
  var newImgs = [];      // صور مضافة {file,url}
  var newFile = null;    // ملف بديل
  var gallery = [];      // الصور الحالية


  // نبني النافذة بأنفسنا لتبقى اللوحة صغيرة
  function ensureModal() {
    if ($('edModal')) return;
    var st = document.createElement('style');
    st.textContent = '.modal{position:fixed;inset:0;z-index:9000;' +
      'background:rgba(8,10,14,.94);display:none;align-items:flex-start;' +
      'justify-content:center;padding:14px;overflow-y:auto}' +
      '.modal.on{display:flex}' +
      '.modal-in{background:#151922;border:1px solid #242a36;border-radius:16px;' +
      'padding:18px;max-width:460px;width:100%;margin:auto}';
    document.head.appendChild(st);

    var d = document.createElement('div');
    d.className = 'modal';
    d.id = 'edModal';
    d.innerHTML =
      '<div class="modal-in">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
          '<h2 style="margin:0">تعديل المنتج</h2>' +
          '<button onclick="closeEdit()" style="background:transparent;border:0;' +
            'color:#9aa0a6;font-size:1.3rem;cursor:pointer;font-family:inherit">✕</button>' +
        '</div>' +
        '<div id="edMsg"></div>' +
        '<label>اسم المنتج</label><input id="eTitle" maxlength="90">' +
        '<label>وصف قصير</label><input id="eSub" maxlength="120">' +
        '<label>الوصف الكامل</label><textarea id="eDesc" rows="3"></textarea>' +
        '<label>السعر (دج)</label><input id="eDzd" type="number" min="0">' +
        '<label>السعر ($)</label><input id="eUsd" type="number" min="0" step="0.01">' +
        '<div class="up-box">' +
          '<div class="up-t">🖼️ الصور الحالية</div>' +
          '<div id="eImgsNow" class="img-grid"></div>' +
          '<div class="up-s" style="margin-top:10px">إضافة صور جديدة</div>' +
          '<label class="up-btn"><input type="file" id="eImgs" accept="image/*" multiple hidden>📷 اختر صوراً</label>' +
          '<div id="eImgGrid" class="img-grid"></div>' +
          '<div id="eImgBar" class="bar hide"><div id="eImgFill" class="fill"></div></div>' +
        '</div>' +
        '<div class="up-box">' +
          '<div class="up-t">📦 ملف المنتج</div>' +
          '<div id="eFileNow" class="up-s"></div>' +
          '<label class="up-btn"><input type="file" id="eFile" hidden>📎 استبدل الملف</label>' +
          '<div id="eFileName" class="up-s" style="margin-top:8px"></div>' +
          '<div id="eFileBar" class="bar hide"><div id="eFileFill" class="fill"></div></div>' +
        '</div>' +
        '<button class="btn" style="margin-top:14px" onclick="saveEdit()">حفظ التعديلات</button>' +
        '<button class="btn-copy" style="width:100%;margin-top:8px" onclick="closeEdit()">إلغاء</button>' +
      '</div>';
    document.body.appendChild(d);
  }

  // ── فتح النافذة ──
  window.editProduct = function (id) {
    ensureModal();
    rest('digital_products?id=eq.' + encodeURIComponent(id) +
      '&select=id,title,subtitle,description,price_dzd,price_usd,cover_url,gallery,file_path,file_url')
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        var p = rows && rows[0];
        if (!p) { alert('تعذّر تحميل المنتج'); return; }
        cur = p;
        newImgs = []; newFile = null;
        gallery = Array.isArray(p.gallery) ? p.gallery.slice() : [];
        if (!gallery.length && p.cover_url) gallery = [p.cover_url];

        $('eTitle').value = p.title || '';
        $('eSub').value   = p.subtitle || '';
        $('eDesc').value  = p.description || '';
        $('eDzd').value   = p.price_dzd || '';
        $('eUsd').value   = p.price_usd || '';
        $('eFileNow').innerHTML = (p.file_path || p.file_url)
          ? '<span style="color:#2ECC71">✓ يوجد ملف مرفوع</span>'
          : '<span style="color:#E74C3C">⚠️ لا يوجد ملف — المشتري لن يستطيع التحميل</span>';
        $('eFileName').textContent = '';
        $('eImgGrid').innerHTML = '';
        note('edMsg', '');
        drawNow();
        bind();
        $('edModal').classList.add('on');
      })
      .catch(function () { alert('تعذّر الاتصال'); });
  };

  window.closeEdit = function () {
    $('edModal').classList.remove('on');
    newImgs.forEach(function (x) { try { URL.revokeObjectURL(x.url); } catch (e) {} });
    newImgs = []; newFile = null; cur = null;
  };

  // ── الصور الحالية ──
  function drawNow() {
    var box = $('eImgsNow');
    if (!box) return;
    box.innerHTML = gallery.length ? gallery.map(function (u, i) {
      return '<div class="img-cell"><img src="' + esc(u) + '">' +
        '<button class="img-x" onclick="tjRmOld(' + i + ')">✕</button>' +
        (i === 0 ? '<div class="img-c">الغلاف</div>' : '') + '</div>';
    }).join('') : '<div class="up-s">لا صور بعد.</div>';
  }

  window.tjRmOld = function (i) { gallery.splice(i, 1); drawNow(); };

  function drawNew() {
    var box = $('eImgGrid');
    if (!box) return;
    box.innerHTML = newImgs.map(function (p, i) {
      return '<div class="img-cell"><img src="' + p.url + '">' +
        '<button class="img-x" onclick="tjRmNew(' + i + ')">✕</button></div>';
    }).join('');
  }

  window.tjRmNew = function (i) {
    try { URL.revokeObjectURL(newImgs[i].url); } catch (e) {}
    newImgs.splice(i, 1); drawNew();
  };

  // ── اختيار الملفات ──
  function bind() {
    var im = $('eImgs'), fl = $('eFile');
    if (im && !im.__b) {
      im.__b = 1;
      im.addEventListener('change', function () {
        var list = Array.prototype.slice.call(im.files || []);
        for (var i = 0; i < list.length; i++) {
          if (gallery.length + newImgs.length >= 6) break;
          if (!list[i].type.indexOf) continue;
          if (list[i].type.indexOf('image/') !== 0) continue;
          if (list[i].size > 8 * 1024 * 1024) {
            note('edMsg', 'صورة كبيرة جداً: ' + list[i].name.slice(0, 22));
            continue;
          }
          newImgs.push({ file: list[i], url: URL.createObjectURL(list[i]) });
        }
        im.value = '';
        drawNew();
      });
    }
    if (fl && !fl.__b) {
      fl.__b = 1;
      fl.addEventListener('change', function () {
        var f = fl.files && fl.files[0];
        if (!f) return;
        if (f.size > 50 * 1024 * 1024) {
          note('edMsg', 'الملف أكبر من 50 م.ب.');
          fl.value = ''; return;
        }
        newFile = f;
        $('eFileName').innerHTML = '✓ ' + esc(f.name.slice(0, 38)) +
          ' (' + (f.size / 1048576).toFixed(1) + ' م.ب)';
      });
    }
  }

  // ── الحفظ ──
  window.saveEdit = async function () {
    if (!cur) return;
    var title = $('eTitle').value.trim();
    var dzd = Number($('eDzd').value);
    if (title.length < 3) return note('edMsg', 'اكتب اسم المنتج.');
    if (!(dzd > 0)) return note('edMsg', 'أدخل سعراً صحيحاً.');

    var btn = document.querySelector('#edModal .btn');
    btn.disabled = true; btn.textContent = 'جارٍ الحفظ…';
    note('edMsg', '');

    try {
      var s = sess();
      var uid = s && s.user && s.user.id;
      if (!uid) throw new Error('سجّل الدخول أولاً');

      // نرفع الصور الجديدة عبر upload.js
      var added = [];
      if (newImgs.length) {
        if (typeof window.tjUploadList !== 'function') {
          throw new Error('أداة الرفع غير محمّلة — حدّث الصفحة');
        }
        $('eImgBar').classList.remove('hide');
        added = await window.tjUploadList(uid, newImgs.map(function (x) { return x.file; }),
          function (pct) { $('eImgFill').style.width = pct + '%'; });
      }

      var all = gallery.concat(added).slice(0, 6);

      var patch = {
        title: title,
        subtitle: $('eSub').value.trim() || null,
        description: $('eDesc').value.trim() || null,
        price_dzd: dzd,
        price_usd: Number($('eUsd').value) || null,
        gallery: all,
        cover_url: all[0] || null
      };

      if (newFile) {
        if (typeof window.tjUploadOne !== 'function') {
          throw new Error('أداة الرفع غير محمّلة — حدّث الصفحة');
        }
        $('eFileBar').classList.remove('hide');
        $('eFileFill').style.width = '40%';
        patch.file_path = await window.tjUploadOne(uid, newFile);
        patch.file_size = (newFile.size / 1048576).toFixed(1) + ' MB';
        $('eFileFill').style.width = '100%';
      }

      var r = await rest('digital_products?id=eq.' + encodeURIComponent(cur.id), {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(patch)
      });
      if (!r.ok) {
        var d = await r.json().catch(function () { return {}; });
        throw new Error(d.message || ('رمز ' + r.status));
      }

      note('edMsg', 'حُفظت التعديلات ✓', 'good');
      setTimeout(function () {
        window.closeEdit();
        if (typeof window.tjReloadProducts === 'function') window.tjReloadProducts();
        else location.reload();
      }, 800);
    } catch (e) {
      note('edMsg', String(e.message || e).slice(0, 150));
    } finally {
      btn.disabled = false; btn.textContent = 'حفظ التعديلات';
    }
  };
})();
