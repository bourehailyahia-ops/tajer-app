/* تاجر — رفع صور وملفات المنتج من الهاتف
   يُحمَّل قبل لوحة البائع ويوفّر لها دوال الرفع.
   الصور تُصغَّر قبل الرفع لأن صور الهواتف كبيرة جداً على شبكة 4G. */
(function () {
  'use strict';

  var SB_URL = 'https://rnaqsvmtszxgbvzaagzx.supabase.co';
  var SB_KEY = 'sb_publishable_ly90vH9XsCT_05kxQenomw_LE5aCud-';

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
  function token() {
    try {
      var s = JSON.parse(localStorage.getItem('tajer_session') || 'null');
      return s && s.access_token;
    } catch (e) { return null; }
  }

  // رفع مباشر عبر واجهة التخزين (بلا مكتبة، أخفّ على الهاتف)
  function putFile(bucket, path, blob, type) {
    var t = token();
    if (!t) return Promise.reject(new Error('سجّل الدخول أولاً'));
    return fetch(SB_URL + '/storage/v1/object/' + bucket + '/' + encodeURI(path), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + t,
        apikey: SB_KEY,
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

  function publicUrl(bucket, path) {
    return SB_URL + '/storage/v1/object/public/' + bucket + '/' + encodeURI(path);
  }

  let pickedImgs = [];   // {file, url}
  let pickedFile = null;

  function bindUploads() {
    const imgs = $('nImgs'), file = $('nFile');
    if (imgs && !imgs.__b) {
      imgs.__b = 1;
      imgs.addEventListener('change', () => {
        const list = Array.from(imgs.files || []);
        for (const f of list) {
          if (pickedImgs.length >= 6) break;
          if (!f.type.startsWith('image/')) continue;
          if (f.size > 8 * 1024 * 1024) {          // 8 م.ب لكل صورة
            note('addMsg', 'صورة كبيرة جداً: ' + f.name.slice(0, 24));
            continue;
          }
          pickedImgs.push({ file: f, url: URL.createObjectURL(f) });
        }
        imgs.value = '';
        drawImgs();
      });
    }
    if (file && !file.__b) {
      file.__b = 1;
      file.addEventListener('change', () => {
        const f = file.files && file.files[0];
        if (!f) return;
        if (f.size > 50 * 1024 * 1024) {
          note('addMsg', 'الملف أكبر من 50 م.ب.');
          file.value = ''; return;
        }
        pickedFile = f;
        $('fileName').innerHTML = '✓ ' + esc(f.name.slice(0, 40)) +
          ' <span style="color:#9aa0a6">(' + (f.size / 1048576).toFixed(1) + ' م.ب)</span>';
      });
    }
  }

  function drawImgs() {
    const g = $('imgGrid');
    if (!g) return;
    g.innerHTML = pickedImgs.map((p, i) =>
      '<div class="img-cell"><img src="' + p.url + '">' +
      '<button class="img-x" onclick="rmImg(' + i + ')">✕</button>' +
      (i === 0 ? '<div class="img-c">الغلاف</div>' : '') +
      '</div>').join('');
  }

  window.rmImg = (i) => {
    try { URL.revokeObjectURL(pickedImgs[i].url); } catch (e) {}
    pickedImgs.splice(i, 1);
    drawImgs();
  };

  // تصغير الصورة قبل الرفع: أسرع بكثير على شبكة الهاتف
  function shrinkImg(f, max = 1400) {
    return new Promise((resolve) => {
      const fr = new FileReader();
      fr.onerror = () => resolve(f);
      fr.onload = () => {
        const im = new Image();
        im.onerror = () => resolve(f);
        im.onload = () => {
          let w = im.width, h = im.height;
          if (w <= max && h <= max && f.size < 400000) return resolve(f);
          if (w > h) { h = Math.round(h * max / w); w = max; }
          else { w = Math.round(w * max / h); h = max; }
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(im, 0, 0, w, h);
          cv.toBlob((b) => resolve(b && b.size < f.size ? b : f), 'image/jpeg', 0.85);
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(f);
    });
  }

  const safeName = (n) => String(n).replace(/[^\w.\-]+/g, '_').slice(-60);

  async function uploadImages(uid) {
    if (!pickedImgs.length) return [];
    const bar = $('imgBar'), fill = $('imgFill');
    bar.classList.remove('hide');
    const urls = [];
    for (let i = 0; i < pickedImgs.length; i++) {
      const blob = await shrinkImg(pickedImgs[i].file);
      const path = uid + '/' + Date.now() + '_' + i + '_' + safeName(pickedImgs[i].file.name);
      try {
        await putFile('product-images', path, blob, blob.type || 'image/jpeg');
      } catch (e) { throw new Error('تعذّر رفع الصورة: ' + e.message); }
      urls.push(publicUrl('product-images', path));
      fill.style.width = Math.round(((i + 1) / pickedImgs.length) * 100) + '%';
    }
    return urls;
  }

  async function uploadFile(uid) {
    if (!pickedFile) return null;
    const bar = $('fileBar'), fill = $('fileFill');
    bar.classList.remove('hide');
    fill.style.width = '35%';
    const path = uid + '/' + Date.now() + '_' + safeName(pickedFile.name);
    try {
      await putFile('product-files', path, pickedFile,
        pickedFile.type || 'application/octet-stream');
    } catch (e) { throw new Error('تعذّر رفع الملف: ' + e.message); }
    fill.style.width = '100%';
    return path;
  }

  function resetUploads() {
    pickedImgs.forEach((p) => { try { URL.revokeObjectURL(p.url); } catch (e) {} });
    pickedImgs = []; pickedFile = null;
    drawImgs();
    $('fileName').textContent = '';
    ['imgBar', 'fileBar'].forEach((i) => {
      $(i).classList.add('hide');
      $(i).firstElementChild.style.width = '0';
    });
  }

  // نكشف ما تحتاجه اللوحة
  window.tjUploadImages = uploadImages;
  window.tjUploadFile   = uploadFile;
  window.tjResetUploads = resetUploads;
  window.tjHasFile      = function () { return !!pickedFile; };
  window.tjFileSize     = function () {
    return pickedFile ? (pickedFile.size / 1048576).toFixed(1) + ' MB' : null;
  };

  function boot() { try { bindUploads(); } catch (e) {} }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
  [600, 1800, 3500].forEach(function (ms) { setTimeout(boot, ms); });
})();
