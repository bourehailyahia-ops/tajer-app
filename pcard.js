/* تاجر — مولّد بطاقات المنتج
   يرسم بطاقة جاهزة للنشر على فيسبوك وإنستغرام والستوري.
   كل شيء على جهاز المستخدم: لا خادم، لا مفاتيح، لا تكلفة.
   الحقول اختيارية — ما يُترك فارغاً لا يظهر على البطاقة.
   لتعطيله: احذف سطر <script src="/pcard.js"> من index.html */
(function () {
  'use strict';

  function el(id) { return document.getElementById(id); }

  var HDR = function (icon, title, sub) {
    return '<div class="hdr"><button class="back-btn" onclick="back()">' +
      '<svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>' +
      '<div class="hdr-info"><h3>' + icon + ' ' + title + '</h3><p>' + sub + '</p></div></div>';
  };
  var NOTE = '<div style="background:var(--gold-dim);border:1px solid var(--line);' +
    'border-radius:var(--r);padding:12px;font-size:.8rem;color:var(--gold-l);line-height:1.6;">' +
    '✨ تعمل بالكامل على جهازك — صورتك لا تُرفع لأي خادم، وبدون أي تكلفة.</div>';

  function buildScreen() {
    if (el('sv-card')) return;
    var first = document.querySelector('.screen');
    var host = first && first.parentNode;
    if (!host) return;

    var pc = document.createElement('div');
    pc.className = 'screen';
    pc.id = 'sv-card';
    pc.innerHTML = HDR('card', '🖼️', 'بطاقة منتج', 'صورة جاهزة للنشر على فيسبوك وإنستغرام') +
      '<div class="svc-body">' + NOTE +
      '<label class="upload-zone" id="pcZone" style="border:1.5px dashed var(--line);' +
        'border-radius:var(--r);padding:26px 18px;text-align:center;cursor:pointer;display:block;">' +
        '<input type="file" id="pcImg" accept="image/*" style="display:none;">' +
        '<div style="font-size:2.2rem;margin-bottom:8px;">📷</div>' +
        '<div id="pcImgLbl" style="font-size:.88rem;">اضغط لاختيار صورة المنتج</div>' +
        '<div style="font-size:.7rem;color:var(--muted);margin-top:5px;">JPG · PNG · WEBP</div>' +
      '</label>' +
      '<div class="f-label">المقاس</div>' +
      '<select class="f-input" id="pcSize">' +
        '<option value="sq">مربّع — فيسبوك وإنستغرام (1080×1080)</option>' +
        '<option value="st">عمودي — ستوري وتيك توك (1080×1920)</option>' +
      '</select>' +
      '<div class="f-label">لون البطاقة</div>' +
      '<select class="f-input" id="pcTheme">' +
        '<option value="gold">أسود وذهبي</option>' +
        '<option value="white">أبيض ونظيف</option>' +
        '<option value="red">أحمر — للتخفيضات</option>' +
        '<option value="blue">أزرق هادئ</option>' +
      '</select>' +
      '<div style="background:var(--panel);border:1px solid var(--line);border-radius:var(--r);' +
        'padding:12px;margin-top:14px;">' +
        '<div style="font-size:.76rem;color:var(--muted);margin-bottom:10px;">' +
        '✏️ اكتب ما تريد ظهوره — اترك أي خانة فارغة فلن تظهر</div>' +
        '<div class="f-label">اسم المنتج</div>' +
        '<input class="f-input" id="pcTitle" maxlength="60" placeholder="حقيبة جلدية يدوية">' +
        '<div class="f-label">السعر</div>' +
        '<input class="f-input" id="pcPrice" maxlength="24" placeholder="3500 دج">' +
        '<div class="f-label">السعر القديم (يُشطب)</div>' +
        '<input class="f-input" id="pcOld" maxlength="24" placeholder="5000 دج">' +
        '<div class="f-label">شارة الزاوية</div>' +
        '<input class="f-input" id="pcBadge" maxlength="18" placeholder="تخفيض 30%">' +
        '<div class="f-label">سطر إضافي</div>' +
        '<input class="f-input" id="pcNote" maxlength="46" placeholder="توصيل لكل الولايات">' +
        '<div class="f-label">اسمك أو رقمك (أسفل البطاقة)</div>' +
        '<input class="f-input" id="pcFoot" maxlength="40" placeholder="متجر يحيى · 0555 12 34 56">' +
      '</div>' +
      '<button class="btn-gold" onclick="tjCardMake()">🖼️ إنشاء البطاقة</button>' +
      '<div id="pcErr" style="display:none;color:#E74C3C;font-size:.82rem;margin-top:10px;"></div>' +
      '<div id="pcOut" style="display:none;margin-top:16px;">' +
        '<canvas id="pcCanvas" style="width:100%;border-radius:var(--r);' +
          'border:1px solid var(--line);"></canvas>' +
        '<a id="pcDl" class="btn-gold" style="display:block;margin-top:12px;text-align:center;' +
          'text-decoration:none;" download="tajer-card.png">⬇ تحميل البطاقة</a>' +
      '</div></div>';
    host.appendChild(pc);
  }

  function buildCard() {
    if (el('tjCardPc')) return;
    var grid = document.querySelector('.svc-grid');
    if (!grid) return;
    var model = null, all = grid.querySelectorAll('.svc-card');
    for (var i = 0; i < all.length; i++) {
      var c = all[i];
      if (!c.querySelector('.pro-tag') && !c.querySelector('.pro-lock-tag')
          && c.style.display !== 'none') { model = c; break; }
    }
    if (!model) return;
    var b = model.cloneNode(true);
    b.id = 'tjCardPc';
    b.setAttribute('onclick', "goFree('card')");
    b.classList.remove('locked');
    var ids = b.querySelectorAll('[id]');
    for (var j = 0; j < ids.length; j++) ids[j].removeAttribute('id');
    var i18 = b.querySelectorAll('[data-i18n]');
    for (var k = 0; k < i18.length; k++) i18[k].removeAttribute('data-i18n');
    var ic = b.querySelector('.svc-icon'), nm = b.querySelector('.svc-name'),
        sb = b.querySelector('.svc-sub');
    if (ic) ic.textContent = '🖼️';
    if (nm) nm.textContent = 'بطاقة منتج';
    if (sb) sb.textContent = 'صورة جاهزة للنشر';
    grid.appendChild(b);
  }

  var PC_THEMES = {
    gold:  { bg1:'#0d0f14', bg2:'#1c1710', txt:'#ffffff', accent:'#C9A84C',
             sub:'#b9bec7', badge:'#C9A84C', badgeTxt:'#12151c' },
    white: { bg1:'#ffffff', bg2:'#f1f2f5', txt:'#14181f', accent:'#0f62fe',
             sub:'#5b6472', badge:'#14181f', badgeTxt:'#ffffff' },
    red:   { bg1:'#1a0708', bg2:'#3d0f12', txt:'#ffffff', accent:'#ff4d5a',
             sub:'#e3c3c6', badge:'#ff4d5a', badgeTxt:'#ffffff' },
    blue:  { bg1:'#08111f', bg2:'#10243d', txt:'#ffffff', accent:'#4aa8ff',
             sub:'#b6c8dc', badge:'#4aa8ff', badgeTxt:'#08111f' }
  };

  var pcFile = null;
  function pcBind() {
    var inp = el('pcImg');
    if (!inp || inp.__b) return;
    inp.__b = 1;
    inp.addEventListener('change', function () {
      pcFile = inp.files && inp.files[0];
      var l = el('pcImgLbl');
      if (l) l.textContent = pcFile ? ('✓ ' + pcFile.name.slice(0, 30)) : 'اضغط لاختيار صورة المنتج';
    });
  }

  // نصّ يلتفّ على أسطر حسب العرض المتاح
  function pcWrap(ctx, text, maxW, maxLines) {
    var words = String(text).split(/\s+/), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else cur = t;
      if (lines.length >= maxLines) break;
    }
    if (cur && lines.length < maxLines) lines.push(cur);
    return lines;
  }

  function pcRound(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  window.tjCardMake = function () {
    var errEl = el('pcErr');
    if (errEl) errEl.style.display = 'none';
    var fail = function (m) {
      if (errEl) { errEl.textContent = '❌ ' + m; errEl.style.display = 'block'; }
    };
    if (!pcFile) return fail('اختر صورة المنتج أولاً.');

    var vertical = el('pcSize').value === 'st';
    var W = 1080, H = vertical ? 1920 : 1080;
    var th = PC_THEMES[el('pcTheme').value] || PC_THEMES.gold;

    var title = (el('pcTitle').value || '').trim();
    var price = (el('pcPrice').value || '').trim();
    var old   = (el('pcOld').value || '').trim();
    var badge = (el('pcBadge').value || '').trim();
    var note  = (el('pcNote').value || '').trim();
    var foot  = (el('pcFoot').value || '').trim();

    var fr = new FileReader();
    fr.onerror = function () { fail('تعذّرت قراءة الصورة.'); };
    fr.onload = function () {
      var im = new Image();
      im.onerror = function () { fail('صيغة الصورة غير مدعومة.'); };
      im.onload = function () {
        var cv = el('pcCanvas');
        cv.width = W; cv.height = H;
        var ctx = cv.getContext('2d');
        ctx.textAlign = 'right';
        ctx.direction = 'rtl';

        // الخلفية
        var g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, th.bg1); g.addColorStop(1, th.bg2);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

        // مساحة الصورة: نقصّها لتملأ الإطار بلا تشويه
        var pad = 60;
        var boxW = W - pad * 2;
        var boxH = vertical ? 1180 : 560;
        var boxY = vertical ? 170 : 80;
        var scale = Math.max(boxW / im.width, boxH / im.height);
        var dw = im.width * scale, dh = im.height * scale;

        ctx.save();
        pcRound(ctx, pad, boxY, boxW, boxH, 34);
        ctx.clip();
        ctx.drawImage(im, pad + (boxW - dw) / 2, boxY + (boxH - dh) / 2, dw, dh);
        ctx.restore();

        // شارة الزاوية
        if (badge) {
          ctx.font = '700 40px system-ui, "Segoe UI", Tahoma, sans-serif';
          var bw = ctx.measureText(badge).width + 56;
          ctx.fillStyle = th.badge;
          pcRound(ctx, pad + 22, boxY + 22, bw, 76, 38);
          ctx.fill();
          ctx.fillStyle = th.badgeTxt;
          ctx.textAlign = 'center';
          ctx.fillText(badge, pad + 22 + bw / 2, boxY + 22 + 51);
          ctx.textAlign = 'right';
        }

        var y = boxY + boxH + (vertical ? 130 : 96);
        // نحجز مساحة التذييل حتى لا يتداخل معه النصّ
        var footRoom = foot ? 110 : 30;
        var limitY = H - footRoom;
        var right = W - pad;

        if (title) {
          ctx.fillStyle = th.txt;
          ctx.font = '800 66px system-ui, "Segoe UI", Tahoma, sans-serif';
          var lines = pcWrap(ctx, title, boxW, 2);
          for (var i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], right, y);
            y += 82;
          }
          y += 18;
        }

        if (price) {
          ctx.fillStyle = th.accent;
          ctx.font = '900 92px system-ui, "Segoe UI", Tahoma, sans-serif';
          ctx.fillText(price, right, y);
          var pw = ctx.measureText(price).width;

          if (old) {
            ctx.fillStyle = th.sub;
            ctx.font = '600 48px system-ui, "Segoe UI", Tahoma, sans-serif';
            var ow = ctx.measureText(old).width;
            var ox = right - pw - 34;
            ctx.fillText(old, ox, y - 8);
            ctx.strokeStyle = th.sub;
            ctx.lineWidth = 5;
            var midY = y - 8 - 16;          // منتصف نصّ بحجم 48
            ctx.beginPath();
            ctx.moveTo(ox - ow - 8, midY);
            ctx.lineTo(ox + 8, midY);
            ctx.stroke();
          }
          y += 84;
        }

        if (note) {
          ctx.fillStyle = th.sub;
          ctx.font = '600 44px system-ui, "Segoe UI", Tahoma, sans-serif';
          var nl = pcWrap(ctx, note, boxW, 2);
          for (var j = 0; j < nl.length; j++) {
            if (y > limitY) break;          // لا نكتب فوق التذييل
            ctx.fillText(nl[j], right, y);
            y += 58;
          }
        }

        if (foot) {
          ctx.strokeStyle = th.sub;
          ctx.globalAlpha = 0.25;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pad, H - 118);
          ctx.lineTo(W - pad, H - 118);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = th.accent;
          ctx.font = '700 42px system-ui, "Segoe UI", Tahoma, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(foot, W / 2, H - 62);
          ctx.textAlign = 'right';
        }

        cv.style.maxWidth = '100%';
        el('pcDl').href = cv.toDataURL('image/png');
        el('pcOut').style.display = 'block';
        if (typeof window.saveHist === 'function') {
          window.saveHist('🖼️ بطاقة منتج', 'أُنشئت بطاقة' + (title ? ' لـ' + title : ''));
        }
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(pcFile);
  };


  function run() {
    try { buildScreen(); } catch (e) {}
    try { buildCard(); } catch (e) {}
    try { pcBind(); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else { run(); }
  [500, 1500, 3500].forEach(function (ms) { setTimeout(run, ms); });
})();
