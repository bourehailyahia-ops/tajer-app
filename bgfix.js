/* تاجر — إخفاء أداة إزالة الخلفية
   السبب: المعالجة في المتصفّح تتطلّب تنزيل ~44 م.ب من ملفات
   النموذج على هاتف المستخدم، وتفشل بثبات على الشبكات المحلّية.
   نُخفي البطاقة والشاشة بدل تركها تعطب أمام المستخدمين.

   لإعادتها لاحقاً: احذف سطر <script src="/bgfix.js"> من index.html
   (دالّة الخادم remove-bg جاهزة على سوبابيس متى أردت تفعيلها). */
(function () {
  'use strict';

  function hideCard() {
    var cards = document.querySelectorAll('.svc-card');
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var on = c.getAttribute('onclick') || '';
      if (on.indexOf("goFree('bg')") >= 0 || on.indexOf('goFree("bg")') >= 0) {
        c.style.display = 'none';
        c.setAttribute('data-hidden-by', 'bgfix');
      }
    }
  }

  // إن وصلها أحد برابط مباشر، نعيده للرئيسية بدل شاشة معطوبة
  function guardScreen() {
    if (typeof window.goFree !== 'function' || window.__bgGuard) return;
    window.__bgGuard = true;
    var orig = window.goFree;
    window.goFree = function (kind) {
      if (kind === 'bg') {
        if (typeof window.showToast === 'function') {
          window.showToast('هذه الخدمة غير متاحة حالياً');
        }
        return;
      }
      return orig.apply(this, arguments);
    };
  }

  function run() {
    try { hideCard(); } catch (e) {}
    try { guardScreen(); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else { run(); }

  [300, 1000, 2500, 5000].forEach(function (ms) { setTimeout(run, ms); });

  // البطاقات قد تُعاد رسمها عند تغيير اللغة
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) run();
  });
})();
