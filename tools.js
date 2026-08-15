/* تاجر — أداتان محلّيتان: مولّد QR + فاتورة PDF
   الاثنتان تعملان على جهاز المستخدم. لا خادم، لا مفاتيح، لا تكلفة.
   الفاتورة تُبنى بطباعة المتصفّح لا بمكتبة PDF، لأن مكتبات PDF
   تعرض العربية معكوسة ومفكّكة الحروف.
   لتعطيلهما: احذف سطر <script src="/tools.js"> من index.html */
(function () {
  'use strict';

  var QR_LIBS = [
    'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js',
    'https://unpkg.com/qrcode@1.5.4/build/qrcode.min.js'
  ];

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(m) {
    if (typeof window.showToast === 'function') window.showToast(m);
  }

  // ════════ بناء الشاشات ════════
  var HDR = function (id, icon, title, sub) {
    return '<div class="hdr"><button class="back-btn" onclick="back()">' +
      '<svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>' +
      '<div class="hdr-info"><h3>' + icon + ' ' + title + '</h3><p>' + sub + '</p></div></div>';
  };
  var NOTE = '<div style="background:var(--gold-dim);border:1px solid var(--line);' +
    'border-radius:var(--r);padding:12px;font-size:.8rem;color:var(--gold-l);line-height:1.6;">' +
    '✨ تعمل بالكامل على جهازك — بياناتك لا تُرفع لأي خادم، وبدون أي تكلفة.</div>';

  function buildScreens() {
    if (el('sv-qr')) return;
    var host = document.querySelector('.screen') && document.querySelector('.screen').parentNode;
    if (!host) return;

    var qr = document.createElement('div');
    qr.className = 'screen';
    qr.id = 'sv-qr';
    qr.innerHTML = HDR('qr', '🔳', 'مولّد QR', 'رمز لمتجرك أو منتجك أو رقمك') +
      '<div class="svc-body">' + NOTE +
      '<div class="f-label">النوع</div>' +
      '<select id="qrType" onchange="tjQrType()">' +
        '<option value="url">رابط موقع أو متجر</option>' +
        '<option value="wa">واتساب</option>' +
        '<option value="tel">رقم هاتف</option>' +
        '<option value="text">نص حر</option>' +
      '</select>' +
      '<div class="f-label" id="qrLbl">الرابط</div>' +
      '<input id="qrVal" placeholder="https://tajer-app.vercel.app" dir="ltr">' +
      '<div class="f-label">حجم الرمز</div>' +
      '<select id="qrSize">' +
        '<option value="512">متوسط (512)</option>' +
        '<option value="1024">كبير — للطباعة (1024)</option>' +
        '<option value="256">صغير (256)</option>' +
      '</select>' +
      '<button class="btn-gold" onclick="tjQrGen()">🔳 إنشاء الرمز</button>' +
      '<div id="qrErr" style="display:none;color:#E74C3C;font-size:.82rem;margin-top:10px;"></div>' +
      '<div id="qrOut" style="display:none;text-align:center;margin-top:16px;">' +
        '<div style="background:#fff;padding:16px;border-radius:var(--r);display:inline-block;">' +
          '<canvas id="qrCanvas"></canvas></div>' +
        '<a id="qrDl" class="btn-gold" style="display:block;margin-top:12px;text-align:center;' +
          'text-decoration:none;" download="tajer-qr.png">⬇ تحميل الرمز</a>' +
      '</div></div>';
    host.appendChild(qr);

    var inv = document.createElement('div');
    inv.className = 'screen';
    inv.id = 'sv-inv';
    inv.innerHTML = HDR('inv', '🧾', 'فاتورة احترافية', 'فاتورة جاهزة للطباعة أو الحفظ PDF') +
      '<div class="svc-body">' + NOTE +
      '<div class="f-label">اسم متجرك</div><input id="ivShop" placeholder="متجر تاجر">' +
      '<div class="f-label">هاتفك</div><input id="ivPhone" placeholder="0555 12 34 56" dir="ltr">' +
      '<div class="f-label">اسم الزبون</div><input id="ivClient" placeholder="محمد أمين">' +
      '<div class="f-label">هاتف الزبون / العنوان</div><input id="ivCAddr" placeholder="سطيف">' +
      '<div class="f-label">المنتجات</div>' +
      '<div id="ivRows"></div>' +
      '<button class="btn-copy" onclick="tjInvRow()" style="width:100%;margin-top:6px;">➕ إضافة سطر</button>' +
      '<div class="f-label">سعر التوصيل (دج)</div><input id="ivShip" type="number" min="0" value="0">' +
      '<button class="btn-gold" onclick="tjInvMake()">🧾 إنشاء الفاتورة</button>' +
      '<div id="ivErr" style="display:none;color:#E74C3C;font-size:.82rem;margin-top:10px;"></div>' +
      '</div>';
    host.appendChild(inv);
  }

  function buildCards() {
    if (el('tjCardQr')) return;
    var grid = document.querySelector('.svc-grid');
    if (!grid) return;
    var mk = function (id, fn, icon, name, sub) {
      var b = document.createElement('button');
      b.className = 'svc-card';
      b.id = id;
      b.setAttribute('onclick', fn);
      b.innerHTML = '<div class="svc-icon">' + icon + '</div>' +
        '<div class="svc-name">' + name + '</div>' +
        '<div class="svc-sub">' + sub + '</div>' +
        '<span class="free-tag">✓ متاح</span>';
      return b;
    };
    grid.appendChild(mk('tjCardQr', "goFree('qr')", '🔳', 'مولّد QR', 'رمز لمتجرك ومنتجاتك'));
    grid.appendChild(mk('tjCardInv', "goFree('inv')", '🧾', 'فاتورة احترافية', 'جاهزة للطباعة و PDF'));
  }

  // ════════ مولّد QR ════════
  window.tjQrType = function () {
    var t = el('qrType').value, lbl = el('qrLbl'), inp = el('qrVal');
    var map = {
      url:  ['الرابط', 'https://tajer-app.vercel.app'],
      wa:   ['رقم واتساب (بلا صفر البداية)', '555123456'],
      tel:  ['رقم الهاتف', '0555123456'],
      text: ['النص', 'اكتب ما تشاء']
    };
    lbl.textContent = map[t][0];
    inp.placeholder = map[t][1];
    inp.value = '';
  };

  function loadQrLib() {
    if (window.QRCode && window.QRCode.toCanvas) return Promise.resolve(true);
    var tryOne = function (i) {
      if (i >= QR_LIBS.length) return Promise.reject(new Error('lib'));
      return new Promise(function (res, rej) {
        var s = document.createElement('script');
        s.src = QR_LIBS[i];
        s.onload = function () { res(true); };
        s.onerror = function () { rej(new Error('x')); };
        document.head.appendChild(s);
      }).catch(function () { return tryOne(i + 1); });
    };
    return tryOne(0);
  }

  window.tjQrGen = function () {
    var t = el('qrType').value;
    var v = (el('qrVal').value || '').trim();
    var errEl = el('qrErr'), outEl = el('qrOut');
    errEl.style.display = 'none';
    var fail = function (m) { errEl.textContent = '❌ ' + m; errEl.style.display = 'block'; };

    if (!v) return fail('اكتب المحتوى أولاً.');
    var data = v;
    if (t === 'wa')  data = 'https://wa.me/' + v.replace(/\D/g, '').replace(/^0+/, '213');
    if (t === 'tel') data = 'tel:' + v.replace(/\s/g, '');
    if (t === 'url' && !/^https?:\/\//i.test(v)) data = 'https://' + v;

    loadQrLib().then(function () {
      var size = parseInt(el('qrSize').value, 10) || 512;
      window.QRCode.toCanvas(el('qrCanvas'), data, {
        width: size, margin: 2,
        color: { dark: '#12151c', light: '#ffffff' }
      }, function (err) {
        if (err) return fail('تعذّر إنشاء الرمز. جرّب نصاً أقصر.');
        var c = el('qrCanvas');
        c.style.width = '100%';
        c.style.maxWidth = '260px';
        c.style.height = 'auto';
        el('qrDl').href = c.toDataURL('image/png');
        outEl.style.display = 'block';
        if (typeof window.saveHist === 'function') {
          window.saveHist('🔳 مولّد QR', 'أُنشئ رمز QR بنجاح');
        }
      });
    }).catch(function () {
      fail('تعذّر تحميل المكتبة. تحقّق من الإنترنت وحاول مجدداً.');
    });
  };

  // ════════ فاتورة ════════
  var rowN = 0;
  window.tjInvRow = function () {
    var box = el('ivRows');
    if (!box) return;
    rowN++;
    var d = document.createElement('div');
    d.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:center;';
    d.innerHTML =
      '<input class="iv-n" placeholder="المنتج" style="flex:2;">' +
      '<input class="iv-q" type="number" min="1" value="1" placeholder="كم" style="flex:.7;">' +
      '<input class="iv-p" type="number" min="0" placeholder="السعر" style="flex:1;">' +
      '<button onclick="this.parentNode.remove()" style="background:transparent;border:1px solid var(--line);' +
      'color:#E74C3C;border-radius:8px;padding:8px 10px;cursor:pointer;font-family:inherit;">✕</button>';
    box.appendChild(d);
  };

  window.tjInvMake = function () {
    var errEl = el('ivErr');
    errEl.style.display = 'none';
    var fail = function (m) { errEl.textContent = '❌ ' + m; errEl.style.display = 'block'; };

    var rows = [];
    var boxes = el('ivRows').children;
    for (var i = 0; i < boxes.length; i++) {
      var r = boxes[i];
      var n = r.querySelector('.iv-n').value.trim();
      var q = parseFloat(r.querySelector('.iv-q').value) || 0;
      var p = parseFloat(r.querySelector('.iv-p').value) || 0;
      if (n && q > 0 && p >= 0) rows.push({ n: n, q: q, p: p });
    }
    if (!rows.length) return fail('أضف منتجاً واحداً على الأقل.');

    var ship = parseFloat(el('ivShip').value) || 0;
    var sub = rows.reduce(function (a, r) { return a + r.q * r.p; }, 0);
    var total = sub + ship;
    var dz = function (n) { return Number(n).toLocaleString('ar-DZ') + ' دج'; };
    var no = 'F' + String(Date.now()).slice(-6);
    var date = new Date().toLocaleDateString('ar-DZ');

    var html = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">' +
      '<title>فاتورة ' + esc(no) + '</title><style>' +
      '@page{size:A4;margin:14mm}' +
      'body{font-family:system-ui,"Segoe UI",Tahoma,sans-serif;color:#111;margin:0;line-height:1.7}' +
      '.top{display:flex;justify-content:space-between;align-items:flex-start;' +
      'border-bottom:3px solid #C9A84C;padding-bottom:14px;margin-bottom:18px}' +
      '.sh{font-size:22px;font-weight:800;color:#C9A84C}' +
      '.mut{color:#666;font-size:13px}' +
      'h1{font-size:17px;margin:0 0 4px}' +
      '.box{background:#f7f7f9;border-radius:8px;padding:12px;margin-bottom:16px}' +
      'table{width:100%;border-collapse:collapse;margin-bottom:14px}' +
      'th{background:#12151c;color:#fff;padding:9px;font-size:13px;text-align:start}' +
      'td{padding:9px;border-bottom:1px solid #e3e3e7;font-size:13px}' +
      '.num{text-align:end;white-space:nowrap}' +
      '.tot{display:flex;justify-content:space-between;padding:7px 0;font-size:14px}' +
      '.grand{border-top:2px solid #C9A84C;margin-top:6px;padding-top:10px;' +
      'font-size:18px;font-weight:800;color:#C9A84C}' +
      '.ft{margin-top:26px;text-align:center;color:#999;font-size:11px;' +
      'border-top:1px solid #e3e3e7;padding-top:12px}' +
      '@media print{.noprint{display:none}}' +
      '.noprint{position:fixed;bottom:0;inset-inline:0;background:#12151c;padding:12px;text-align:center}' +
      '.noprint button{background:#C9A84C;color:#12151c;border:0;border-radius:9px;' +
      'padding:12px 26px;font-weight:800;font-size:15px;font-family:inherit;cursor:pointer}' +
      '</style></head><body>' +
      '<div class="top"><div><div class="sh">' + esc(el('ivShop').value || 'متجري') + '</div>' +
      '<div class="mut">' + esc(el('ivPhone').value || '') + '</div></div>' +
      '<div style="text-align:end"><h1>فاتورة</h1>' +
      '<div class="mut">رقم: ' + esc(no) + '</div>' +
      '<div class="mut">' + esc(date) + '</div></div></div>' +
      '<div class="box"><b>الزبون:</b> ' + esc(el('ivClient').value || '—') +
      (el('ivCAddr').value ? '<br><span class="mut">' + esc(el('ivCAddr').value) + '</span>' : '') +
      '</div>' +
      '<table><tr><th>المنتج</th><th class="num">الكمية</th>' +
      '<th class="num">السعر</th><th class="num">المجموع</th></tr>' +
      rows.map(function (r) {
        return '<tr><td>' + esc(r.n) + '</td><td class="num">' + r.q +
          '</td><td class="num">' + dz(r.p) + '</td><td class="num">' + dz(r.q * r.p) + '</td></tr>';
      }).join('') + '</table>' +
      '<div class="tot"><span>المجموع الفرعي</span><b>' + dz(sub) + '</b></div>' +
      (ship ? '<div class="tot"><span>التوصيل</span><b>' + dz(ship) + '</b></div>' : '') +
      '<div class="tot grand"><span>الإجمالي</span><span>' + dz(total) + '</span></div>' +
      '<div class="ft">شكراً لثقتكم · أُنشئت بواسطة تاجر</div>' +
      '<div class="noprint"><button onclick="window.print()">🖨️ طباعة / حفظ PDF</button></div>' +
      '</body></html>';

    var w = window.open('', '_blank');
    if (!w) return fail('امنح المتصفّح إذن فتح النوافذ ثم أعد المحاولة.');
    w.document.open();
    w.document.write(html);
    w.document.close();
    if (typeof window.saveHist === 'function') {
      window.saveHist('🧾 فاتورة', 'أُنشئت فاتورة بـ ' + dz(total));
    }
  };

  // ════════ التشغيل ════════
  function run() {
    try { buildScreens(); } catch (e) {}
    try { buildCards(); } catch (e) {}
    try { if (el('ivRows') && !el('ivRows').children.length) window.tjInvRow(); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else { run(); }
  [500, 1500, 3500].forEach(function (ms) { setTimeout(run, ms); });
})();
