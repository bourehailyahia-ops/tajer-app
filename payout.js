/* تاجر — بيانات التحويل: BaridiMob أو USDT
   منفصل عن اللوحة لتبقى الملفات صغيرة وقابلة للنقل من الهاتف.
   التحقّق هنا للراحة فقط — الخادم يتحقّق مجدداً قبل الحفظ. */
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
  function token() {
    try {
      var s = JSON.parse(localStorage.getItem('tajer_session') || 'null');
      return s && s.access_token;
    } catch (e) { return null; }
  }
  function rpc(fn, args) {
    var t = token();
    return fetch(SB + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: {
        apikey: KEY, Authorization: 'Bearer ' + (t || KEY),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args || {})
    }).then(function (r) { return r.json().catch(function () { return null; }); })
      .catch(function () { return null; });
  }

  window.switchPay = () => {
    const m = $('pMethod').value;
    $('payBarid').classList.toggle('hide', m !== 'baridimob');
    $('payUsdt').classList.toggle('hide', m !== 'usdt');
  };

  window.checkRib = () => {
    const v = $('pDetails').value.replace(/[^0-9]/g, '');
    const h = $('ribHint');
    if (!v) { h.textContent = ''; return; }
    if (v.length === 20) { h.innerHTML = '<span style="color:#2ECC71">✓ الرقم صحيح</span>'; }
    else { h.innerHTML = '<span style="color:#E74C3C">' + v.length + ' من 20 رقماً</span>'; }
  };

  window.checkUsdt = () => {
    const v = $('pUsdt').value.trim();
    const h = $('usdtHint');
    if (!v) { h.textContent = ''; return; }
    if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(v)) {
      h.innerHTML = '<span style="color:#2ECC71">✓ عنوان TRC20 صحيح</span>';
    } else if (v.startsWith('0x')) {
      h.innerHTML = '<span style="color:#E74C3C">✕ هذا عنوان إيثيريوم — نحتاج TRC20</span>';
    } else {
      h.innerHTML = '<span style="color:#E74C3C">✕ عنوان غير صالح</span>';
    }
  };

  window.savePayout = async () => {
    const method = $('pMethod').value;
    if (!method) return note('payMsg', 'اختر طريقة الاستلام.');

    var data = await rpc('save_payout_info', {
      p_method: method,
      p_details: method === 'baridimob' ? $('pDetails').value : null,
      p_name:    method === 'baridimob' ? $('pName').value.trim() : null,
      p_usdt:    method === 'usdt' ? $('pUsdt').value.trim() : null,
    });
    if (!data || !data.ok) {
      const msgs = {
        bad_rib: 'الـ RIB يجب أن يكون 20 رقماً بالضبط.',
        bad_usdt: 'عنوان USDT غير صالح — تأكّد أنه على شبكة TRC20 ويبدأ بحرف T.',
        missing_name: 'اكتب اسم صاحب الحساب.',
        not_a_seller: 'لا يوجد متجر مرتبط بحسابك.',
      };
      return note('payMsg', msgs[data && data.error] || 'تعذّر الحفظ.');
    }
    if (window.tjSeller) window.tjSeller.payout_method = method;
    note('payMsg', 'حُفظت بياناتك ✓', 'good');
  };

  function boot() { try { if ($('pMethod')) window.switchPay(); } catch (e) {} }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
  [700, 2000, 4000].forEach(function (ms) { setTimeout(boot, ms); });
})();
