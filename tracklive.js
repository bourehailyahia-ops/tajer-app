/* تاجر — عرض حالة الطرد داخل الموقع
   يستعمل dzship (واجهة مجانية بلا تسجيل) التي تترجم الطلب إلى لغة
   كل شركة. بيانات حساب التاجر تُحفظ على الخادم ولا تصل المتصفّح.
   يعمل مع: ياليدين · ZR Express · مايسترو · نويست.
   لتعطيله: احذف سطر <script src="/tracklive.js"> من index.html */
(function () {
  'use strict';

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var FN = 'https://rnaqsvmtszxgbvzaagzx.supabase.co/functions/v1/parcel-track';
  var SBK = 'sb_publishable_ly90vH9XsCT_05kxQenomw_LE5aCud-';

  // الشركات التي يمكن تتبّعها داخل الموقع (تحتاج ربط حساب التاجر)
  // معرّفات قائمة track.js ← معرّفات dzship
  var MAP = { yal: 'yalidine', zr: 'zrexpress', may: 'maystro', noe: 'noest' };

  var LIVE = {
    yalidine:  { name: 'ياليدين — Yalidine',      f: ['apiId', 'apiToken'] },
    zrexpress: { name: 'زد آر إكسبريس — ZR Express', f: ['token', 'key'] },
    maystro:   { name: 'مايسترو — Maystro',        f: ['apiKey'] },
    noest:     { name: 'نويست — NOEST',            f: ['apiToken', 'guid'] }
  };
  var FIELD_AR = {
    apiId: 'API ID', apiToken: 'API Token', token: 'Token',
    key: 'Key', apiKey: 'API Key', guid: 'GUID'
  };

  function sess() {
    try { return JSON.parse(localStorage.getItem('tajer_session') || 'null'); }
    catch (e) { return null; }
  }
  function api(payload) {
    var s = sess();
    return fetch(FN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', apikey: SBK,
        Authorization: 'Bearer ' + ((s && s.access_token) ? s.access_token : SBK)
      },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json().catch(function () { return {}; }); });
  }


  // ── التتبّع داخل الموقع ──
  window.tjTrLive = function () {
    var num = (el('trNum').value || '').trim();
    var co = MAP[el('trCo').value] || el('trCo').value;
    var errEl = el('trErr'), box = el('trLive');
    errEl.style.display = 'none';
    box.style.display = 'none';

    if (!num) {
      errEl.textContent = '❌ اكتب رقم التتبّع أولاً.';
      errEl.style.display = 'block';
      return;
    }
    if (!LIVE[co]) {
      errEl.innerHTML = '❌ عرض الحالة داخل الموقع متاح حالياً لـ: ' +
        'ياليدين · ZR Express · مايسترو · نويست فقط.<br>' +
        'للشركات الأخرى استعمل «فتح موقع الشركة».';
      errEl.style.display = 'block';
      return;
    }
    if (!sess()) {
      errEl.textContent = '❌ سجّل الدخول أولاً.';
      errEl.style.display = 'block';
      return;
    }

    box.style.display = 'block';
    box.innerHTML = '<div style="text-align:center;color:var(--muted);' +
      'font-size:.85rem;padding:16px;">⏳ جارٍ الاستعلام…</div>';

    api({ action: 'track', tracking_no: num, courier: co,
          label: (el('trName').value || '').trim() })
      .then(function (d) {
        if (d && d.ok) { showStatus(box, d, num); return; }
        if (d && d.error === 'not_linked') { askLink(box, co); return; }
        var msgs = {
          rate_limited: 'طلبات كثيرة. انتظر دقيقة.',
          courier_error: 'الشركة رفضت الطلب: ' + (d.detail || 'تحقّق من الرقم والبيانات'),
          bad_number: 'رقم التتبّع غير صالح.',
          busy: 'الخدمة مشغولة. أعد المحاولة بعد ثوانٍ.',
          login_required: 'سجّل الدخول أولاً.'
        };
        box.innerHTML = '<div style="background:rgba(231,76,60,.1);border:1px solid ' +
          'rgba(231,76,60,.3);border-radius:var(--r);padding:13px;font-size:.83rem;' +
          'color:#E74C3C;">❌ ' + esc(msgs[d && d.error] || 'تعذّر الاستعلام.') + '</div>';
      })
      .catch(function () {
        box.innerHTML = '<div style="color:#E74C3C;font-size:.83rem;">تعذّر الاتصال.</div>';
      });
  };

  function showStatus(box, d, num) {
    var done = d.status === 'delivered';
    var bad = ['failed', 'returned', 'cancelled'].indexOf(d.status) >= 0;
    var col = done ? '#2ECC71' : (bad ? '#E74C3C' : 'var(--gold)');
    var evs = (d.events || []).slice().reverse().slice(0, 8);

    box.innerHTML =
      '<div style="background:var(--panel);border:1px solid var(--line);' +
        'border-radius:var(--r);padding:15px;">' +
        '<div style="font-size:.72rem;color:var(--muted);">الحالة الحالية</div>' +
        '<div style="font-size:1.15rem;font-weight:800;color:' + col + ';margin:4px 0 10px;">' +
          esc(d.status_ar || d.status) + '</div>' +
        '<div style="font-size:.7rem;color:var(--muted);direction:ltr;text-align:start;">' +
          esc(num) + '</div>' +
        (evs.length ? '<div style="margin-top:14px;border-top:1px solid var(--line);' +
          'padding-top:12px;">' +
          evs.map(function (e, i) {
            return '<div style="display:flex;gap:9px;margin-bottom:9px;">' +
              '<div style="width:9px;height:9px;border-radius:50%;flex-shrink:0;margin-top:6px;' +
                'background:' + (i === 0 ? col : 'var(--line)') + ';"></div>' +
              '<div style="flex:1;min-width:0;">' +
                '<div style="font-size:.82rem;font-weight:' + (i === 0 ? '700' : '400') + ';">' +
                  esc(e.status_ar || e.status) + '</div>' +
                (e.text ? '<div style="font-size:.74rem;color:var(--muted);">' +
                  esc(e.text) + '</div>' : '') +
                '<div style="font-size:.68rem;color:var(--muted);">' +
                  esc(e.place || '') + (e.at ? ' · ' + esc(String(e.at).slice(0, 16)) : '') +
                '</div>' +
              '</div></div>';
          }).join('') + '</div>' : '') +
      '</div>';
    if (typeof window.saveHist === 'function') {
      window.saveHist('📦 تتبّع طرد', esc(d.status_ar || d.status));
    }
  }

  function askLink(box, co) {
    var c = LIVE[co];
    box.innerHTML =
      '<div style="background:var(--gold-dim);border:1px solid var(--line);' +
        'border-radius:var(--r);padding:15px;">' +
        '<div style="font-size:.9rem;font-weight:700;margin-bottom:6px;">' +
          '🔗 اربط حسابك في ' + esc(c.name) + '</div>' +
        '<div style="font-size:.78rem;color:var(--muted);line-height:1.7;margin-bottom:12px;">' +
          'شركات التوصيل لا تسمح بالاستعلام إلا لأصحاب الحسابات. أدخل بيانات ' +
          'حسابك مرة واحدة لترى حالة طرودك هنا مباشرة. ' +
          '<b>بياناتك تُحفظ على خادمنا ولا تظهر في المتصفّح إطلاقاً.</b></div>' +
        c.f.map(function (f) {
          return '<div class="f-label">' + esc(FIELD_AR[f] || f) + '</div>' +
            '<input class="f-input tj-cred" data-f="' + esc(f) + '" dir="ltr" ' +
            'autocomplete="off" placeholder="' + esc(FIELD_AR[f] || f) + '">';
        }).join('') +
        '<button class="btn-gold" style="margin-top:12px;" ' +
          'onclick="tjTrLink(\'' + esc(co) + '\')">حفظ وتتبّع</button>' +
        '<div style="font-size:.68rem;color:var(--muted);margin-top:9px;">' +
          'تجدها في لوحة تحكّم حسابك لدى الشركة تحت API أو المطوّرين.</div>' +
      '</div>';
  }

  window.tjTrLink = function (co) {
    var inputs = document.querySelectorAll('.tj-cred');
    var creds = {}, missing = false;
    for (var i = 0; i < inputs.length; i++) {
      var v = (inputs[i].value || '').trim();
      if (!v) missing = true;
      creds[inputs[i].getAttribute('data-f')] = v;
    }
    if (missing) {
      if (typeof window.showToast === 'function') window.showToast('⚠️ املأ كل الحقول');
      return;
    }
    var box = el('trLive');
    box.innerHTML = '<div style="text-align:center;color:var(--muted);padding:14px;">⏳ جارٍ الربط…</div>';
    api({ action: 'link', courier: co, creds: creds }).then(function (d) {
      if (d && d.ok) { window.tjTrLive(); return; }
      box.innerHTML = '<div style="color:#E74C3C;font-size:.83rem;">❌ تعذّر الحفظ.</div>';
    }).catch(function () {
      box.innerHTML = '<div style="color:#E74C3C;font-size:.83rem;">تعذّر الاتصال.</div>';
    });
  };


})();
