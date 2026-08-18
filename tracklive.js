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
        if (d && d.ok) {
          showStatus(box, d, num);
          api({ action: 'stats' }).then(function (r) {
            if (r && r.stats) {
              var bar = statsBar(r.stats);
              if (bar) box.innerHTML = bar + box.innerHTML;
            }
          }).catch(function () {});
          return;
        }
        if (d && d.error === 'not_linked') { askLink(box, co); return; }
        if (d && d.error === 'subscription_required') { askSub(box); return; }
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

  function statsBar(st) {
    if (!st || st.error) return '';
    var badge, col;
    if (st.pro_until && new Date(st.pro_until) > new Date()) {
      badge = '👑 برو — غير محدود'; col = 'var(--gold)';
    } else if (st.unlimited) {
      badge = '✓ اشتراك فعّال — غير محدود'; col = '#2ECC71';
    } else {
      badge = 'تجربة مجانية'; col = 'var(--muted)';
    }
    var until = st.track_until || st.pro_until;
    return '<div style="display:flex;align-items:center;justify-content:space-between;' +
      'gap:8px;background:var(--panel);border:1px solid var(--line);border-radius:10px;' +
      'padding:9px 12px;margin-bottom:10px;font-size:.72rem;">' +
      '<span style="color:' + col + ';font-weight:700;">' + badge + '</span>' +
      '<span style="color:var(--muted);">استعملتها <b>' + (st.month || 0) +
        '</b> مرة هذا الشهر</span>' +
      '</div>' +
      (until && st.unlimited ? '<div style="font-size:.66rem;color:var(--muted);' +
        'margin:-6px 0 10px;">صالح حتى ' +
        new Date(until).toLocaleDateString('ar-DZ') + '</div>' : '');
  }

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


  function askSub(box) {
    api({ action: 'status' }).then(function (r) {
      var p = (r && r.prices) || {};
      box.innerHTML =
        '<div style="background:linear-gradient(160deg,var(--gold-dim),var(--panel));' +
          'border:1px solid var(--gold);border-radius:var(--r);padding:18px;text-align:center;">' +
          '<div style="font-size:2rem;">📦</div>' +
          '<div style="font-size:1rem;font-weight:800;margin:6px 0 8px;">' +
            'انتهت محاولاتك المجانية</div>' +
          '<div style="font-size:.82rem;color:var(--muted);line-height:1.8;margin-bottom:14px;">' +
            'تتبّع طرودك داخل تاجر بلا فتح مواقع الشركات، مع سجلّ الأحداث كاملاً.</div>' +

          '<div style="display:flex;gap:8px;margin-bottom:12px;">' +
            '<div style="flex:1;background:var(--panel);border:1px solid var(--line);' +
              'border-radius:12px;padding:12px;">' +
              '<div style="font-size:.68rem;color:var(--muted);">شهري</div>' +
              '<div style="font-size:1.1rem;font-weight:800;color:var(--gold);">' +
                (p.dzd_m || '1250') + ' دج</div>' +
              '<div style="font-size:.64rem;color:var(--muted);">أو $' + (p.usd_m || '5') + '</div>' +
            '</div>' +
            '<div style="flex:1;background:var(--panel);border:1px solid var(--gold);' +
              'border-radius:12px;padding:12px;position:relative;">' +
              '<div style="position:absolute;top:-9px;inset-inline-start:50%;' +
                'transform:translateX(-50%);background:var(--gold);color:var(--ink);' +
                'font-size:.58rem;font-weight:800;padding:2px 9px;border-radius:20px;">' +
                'وفّر 47%</div>' +
              '<div style="font-size:.68rem;color:var(--muted);">سنوي</div>' +
              '<div style="font-size:1.1rem;font-weight:800;color:var(--gold);">' +
                (p.dzd_y || '8000') + ' دج</div>' +
              '<div style="font-size:.64rem;color:var(--muted);">أو $' + (p.usd_y || '35') + '</div>' +
            '</div>' +
          '</div>' +

          '<div style="background:rgba(46,204,113,.1);border:1px solid rgba(46,204,113,.3);' +
            'border-radius:10px;padding:11px;font-size:.8rem;color:#2ECC71;margin-bottom:10px;">' +
            '✨ مشمولة <b>مجاناً</b> مع اشتراك برو وبرو ماكس</div>' +

          // تنبيه إلزامي قبل الدفع: من لا يملك حساباً لن يستفيد
          '<div style="background:rgba(243,156,18,.12);border:1px solid rgba(243,156,18,.4);' +
            'border-radius:10px;padding:12px;font-size:.78rem;line-height:1.8;' +
            'text-align:start;margin-bottom:12px;">' +
            '<b style="color:#F39C12;">⚠️ قبل أن تشترك</b><br>' +
            '<span style="color:var(--text);">هذه الخدمة تتطلّب أن تملك ' +
            '<b>حساب تاجر</b> لدى ياليدين أو ZR Express أو مايسترو أو نويست، ' +
            'وأن تُدخل بيانات حسابك مرة واحدة.</span><br>' +
            '<span style="color:var(--muted);font-size:.74rem;">' +
            'إن كنت تشتري لنفسك من علي إكسبريس ولا تملك حساب شحن، ' +
            '<b>فلن تستفيد من هذا الاشتراك</b> — استعمل زر «فتح موقع الشركة» وهو مجاني.' +
            '</span>' +
          '</div>' +

          '<label style="display:flex;align-items:flex-start;gap:8px;text-align:start;' +
            'font-size:.78rem;color:var(--muted);margin-bottom:12px;cursor:pointer;">' +
            '<input type="checkbox" id="subOk" onchange="tjSubOk()" ' +
              'style="margin-top:3px;flex-shrink:0;width:auto;">' +
            '<span>أفهم أنّي أحتاج حساب تاجر لدى إحدى هذه الشركات.</span>' +
          '</label>' +

          '<button class="btn-gold" id="subBtn" disabled ' +
            'onclick="tjSubPay(\'month\')" style="width:100%;opacity:.45;">' +
            'اشترك شهرياً — ' + (p.dzd_m || '1250') + ' دج</button>' +
          '<button class="btn-copy" id="subBtnY" disabled ' +
            'onclick="tjSubPay(\'year\')" style="width:100%;margin-top:8px;opacity:.45;">' +
            'اشترك سنوياً — ' + (p.dzd_y || '8000') + ' دج</button>' +
          '<button class="btn-copy" id="subBtnU" disabled ' +
            'onclick="tjSubPay(\'month\',\'USD\')" style="width:100%;margin-top:8px;opacity:.45;' +
            'font-size:.78rem;">أو ادفع بـ USDT — $' + (p.usd_m || '5') + ' شهرياً</button>' +
        '</div>';
    }).catch(function () {
      box.innerHTML = '<div style="color:var(--muted);font-size:.83rem;">' +
        'انتهت محاولاتك المجانية. اشترك للمتابعة.</div>';
    });
  }

  // زرّ الاشتراك يفتح تبويب الاشتراك في التطبيق
  window.goTab = window.goTab || function (t) {
    if (typeof window.nav === 'function') window.nav(t);
    else location.href = '/';
  };

  window.tjSubOk = function () {
    var c = el('subOk');
    if (!c) return;
    ['subBtn', 'subBtnY', 'subBtnU'].forEach(function (id) {
      var b = el(id);
      if (!b) return;
      b.disabled = !c.checked;
      b.style.opacity = c.checked ? '1' : '.45';
    });
  };

  // ── الدفع ──
  var SUBFN = 'https://rnaqsvmtszxgbvzaagzx.supabase.co/functions/v1/track-sub';
  function subApi(payload) {
    var s = sess();
    return fetch(SUBFN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', apikey: SBK,
        Authorization: 'Bearer ' + ((s && s.access_token) ? s.access_token : SBK)
      },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json().catch(function () { return {}; }); });
  }

  window.tjSubPay = function (cycle, currency) {
    var box = el('trLive');
    box.innerHTML = '<div style="text-align:center;color:var(--muted);padding:18px;">' +
      '⏳ جارٍ تجهيز الدفع…</div>';
    subApi({ action: 'checkout', cycle: cycle, currency: currency || 'DZD' })
      .then(function (d) {
        if (d && d.ok && d.checkout_url) {
          try { sessionStorage.setItem('tj_track_order', d.order_id); } catch (e) {}
          location.href = d.checkout_url;
          return;
        }
        var msgs = {
          card_disabled: 'الدفع بالبطاقة غير مفعّل حالياً.',
          intl_disabled: 'الدفع بـ USDT غير مفعّل حالياً.',
          gateway_error: 'تعذّر الاتصال ببوابة الدفع. حاول بعد قليل.',
          login_required: 'سجّل الدخول أولاً.'
        };
        box.innerHTML = '<div style="color:#E74C3C;font-size:.83rem;">❌ ' +
          esc(msgs[d && d.error] || 'تعذّر بدء الدفع.') + '</div>';
      })
      .catch(function () {
        box.innerHTML = '<div style="color:#E74C3C;font-size:.83rem;">تعذّر الاتصال.</div>';
      });
  };

  // بعد العودة من بوابة الدفع
  function afterSubPay() {
    var q = null;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    if (q.get('track_sub') !== 'ok') {
      if (q.get('track_sub') === 'fail' && typeof window.showToast === 'function') {
        window.showToast('أُلغيت عملية الدفع');
        try { history.replaceState({}, '', location.pathname); } catch (e) {}
      }
      return;
    }
    var oid = q.get('o');
    if (!oid) { try { oid = sessionStorage.getItem('tj_track_order'); } catch (e) {} }
    if (!oid) return;
    try { history.replaceState({}, '', location.pathname); } catch (e) {}

    var tries = 0;
    (function poll() {
      tries++;
      subApi({ action: 'verify', order_id: oid }).then(function (d) {
        if (d && d.ok) {
          try { sessionStorage.removeItem('tj_track_order'); } catch (e) {}
          if (typeof window.showToast === 'function') {
            window.showToast('✅ فُعّل اشتراك تتبّع الطرود');
          }
          return;
        }
        if (tries < 5) setTimeout(poll, 2500);
      }).catch(function () {});
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(afterSubPay, 900); });
  } else { setTimeout(afterSubPay, 900); }

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
