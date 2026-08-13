// صفحة البائع: tajer-app.vercel.app/s/<slug>
// تُبنى على الخادم ليقرأها جوجل — هذا هو سبب وجودها أصلاً.
const SB_URL = 'https://rnaqsvmtszxgbvzaagzx.supabase.co';
const SB_KEY = 'sb_publishable_ly90vH9XsCT_05kxQenomw_LE5aCud-';
const SITE = 'https://tajer-app.vercel.app';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

async function sb(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!r.ok) return null;
  return r.json();
}

function notFound(res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(404).send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>المتجر غير موجود — تاجر</title>
<style>body{background:#0d0f14;color:#e8eaed;font-family:system-ui,sans-serif;
display:flex;flex-direction:column;align-items:center;justify-content:center;
min-height:100vh;margin:0;text-align:center;padding:20px}
a{color:#C9A84C;text-decoration:none;margin-top:16px}</style></head>
<body><h1>هذا المتجر غير موجود</h1>
<p style="color:#9aa0a6">قد يكون الرابط خاطئاً أو المتجر لم يُعتمد بعد.</p>
<a href="${SITE}">العودة إلى تاجر</a></body></html>`);
}

export default async function handler(req, res) {
  const slug = String(req.query?.slug || '').trim().toLowerCase();
  if (!slug || slug.length > 40) return notFound(res);

  const sellers = await sb(`sellers_public?slug=eq.${encodeURIComponent(slug)}&limit=1`);
  const s = sellers?.[0];
  if (!s) return notFound(res);

  const products = (await sb(
    `digital_products?seller_id=eq.${s.id}&status=eq.approved` +
    `&select=id,title,subtitle,description,icon,price_dzd,price_usd,cover_url,` +
    `preview_url,file_format,pages,sales_count&order=created_at.desc&limit=50`
  )) || [];

  const title = `${s.display_name} — منتجات رقمية على تاجر`;
  const desc = s.bio
    ? String(s.bio).slice(0, 155)
    : `تصفّح ${products.length} منتجاً رقمياً من ${s.display_name} على منصّة تاجر.`;
  const cover = s.cover_url || s.avatar_url || `${SITE}/icon-512.png`;

  // بيانات منظّمة: متجر + منتجاته
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: s.display_name,
    description: desc,
    url: `${SITE}/s/${s.slug}`,
    image: cover,
    makesOffer: products.slice(0, 20).map((p) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Product', name: p.title, description: p.subtitle || '' },
      price: String(p.price_dzd || 0),
      priceCurrency: 'DZD',
      availability: 'https://schema.org/InStock',
    })),
  };

  // غلاف بديل مولَّد من الأيقونة حين لا توجد صورة — يملأ الفراغ البصري
  const palette = ['#C9A84C,#8a6f2a', '#3498db,#1f5c8b', '#2ECC71,#1c7a45',
                   '#9b59b6,#5f3172', '#e67e22,#9c4a10', '#e74c3c,#8f2b21'];

  const cards = products.length ? products.map((p, i) => {
    const [c1, c2] = palette[i % palette.length].split(',');
    const cover = p.cover_url
      ? `<img class="cover" src="${esc(p.cover_url)}" alt="${esc(p.title)}" loading="lazy">`
      : `<div class="cover gen" style="background:linear-gradient(135deg,${c1},${c2})">
           <span class="gen-ic">${esc(p.icon || '📘')}</span>
           <span class="gen-t">${esc(String(p.title).slice(0, 42))}</span>
         </div>`;
    return `
    <article class="card">
      ${cover}
      <div class="card-body">
        <div class="row">
          <span class="ic">${esc(p.icon || '📘')}</span>
          <div class="grow">
            <h2>${esc(p.title)}</h2>
            ${p.subtitle ? `<p class="sub">${esc(p.subtitle)}</p>` : ''}
          </div>
        </div>
        ${p.description ? `<p class="desc">${esc(String(p.description).slice(0, 260))}</p>` : ''}
        <div class="tags">
          ${p.file_format ? `<span class="tag">📄 ${esc(p.file_format)}</span>` : ''}
          ${p.pages ? `<span class="tag">${esc(p.pages)}</span>` : ''}
          ${p.sales_count > 0 ? `<span class="tag">🔥 ${p.sales_count} مبيع</span>` : ''}
        </div>
        <div class="buy">
          <div class="price">
            <strong>${Number(p.price_dzd || 0).toLocaleString('ar-DZ')} دج</strong>
            ${p.price_usd ? `<span class="usd">≈ $${Number(p.price_usd).toFixed(2)}</span>` : ''}
          </div>
          <a class="btn" href="${SITE}/?p=${p.id}&s=${esc(s.slug)}">شراء</a>
        </div>
        ${p.preview_url ? `<a class="prev" href="${esc(p.preview_url)}" target="_blank" rel="noopener">👁 معاينة مجانية</a>` : ''}
      </div>
    </article>`; }).join('')
    : `<p class="empty">لا توجد منتجات معروضة بعد.</p>`;

  const links = [
    s.whatsapp ? `<a class="lnk" href="https://wa.me/${esc(String(s.whatsapp).replace(/\D/g, ''))}" rel="nofollow noopener" target="_blank">واتساب</a>` : '',
    s.facebook_url ? `<a class="lnk" href="${esc(s.facebook_url)}" rel="nofollow noopener" target="_blank">فيسبوك</a>` : '',
    s.instagram_url ? `<a class="lnk" href="${esc(s.instagram_url)}" rel="nofollow noopener" target="_blank">إنستغرام</a>` : '',
  ].filter(Boolean).join('');

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/s/${esc(s.slug)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(cover)}">
<meta property="og:url" content="${SITE}/s/${esc(s.slug)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${SITE}/icon-192.png">
<script>
// قياس: زيارة صفحة متجر (مجهولة الهوية، بلا كوكيز)
(function(){try{
  var k=localStorage.getItem('tj_sk');
  if(!k){k=Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem('tj_sk',k);}
  fetch('${SB_URL}/rest/v1/rpc/track_funnel',{method:'POST',keepalive:true,
    headers:{apikey:'${SB_KEY}',Authorization:'Bearer ${SB_KEY}','Content-Type':'application/json'},
    body:JSON.stringify({p_step:'view_store',p_session:k,p_detail:'${esc(s.slug)}'})}).catch(function(){});
}catch(e){}})();
</script>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')}</script>
<style>
:root{--bg:#0d0f14;--panel:#151922;--line:#242a36;--text:#e8eaed;--muted:#9aa0a6;--gold:#C9A84C}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.7}
.wrap{max-width:780px;margin:0 auto;padding:0 16px 40px}
header{background:linear-gradient(160deg,rgba(201,168,76,.14),var(--panel));border-bottom:1px solid var(--line);padding:32px 16px 26px;text-align:center}
.avatar{width:88px;height:88px;border-radius:50%;object-fit:cover;border:3px solid var(--gold);background:var(--panel)}
h1{font-size:1.5rem;margin:14px 0 6px}
.bio{color:var(--muted);font-size:.92rem;max-width:560px;margin:0 auto}
.meta{color:var(--muted);font-size:.8rem;margin-top:10px}
.links{margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.lnk{color:var(--gold);border:1px solid var(--line);border-radius:999px;padding:6px 16px;font-size:.82rem;text-decoration:none}
h2{font-size:1rem;margin:0}
.sec{font-size:.82rem;color:var(--muted);margin:28px 0 12px;font-weight:600}
.card{background:var(--panel);border:1px solid var(--line);border-radius:16px;margin-bottom:14px;overflow:hidden}
.cover{width:100%;height:170px;object-fit:cover;display:block}
.card-body{padding:15px}
.row{display:flex;gap:11px;align-items:flex-start}
.ic{font-size:28px;flex-shrink:0}
.grow{flex:1;min-width:0}
.sub{font-size:.78rem;color:var(--muted);margin:3px 0 0}
.desc{font-size:.83rem;color:var(--muted);margin:10px 0 0}
.tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.tag{font-size:.68rem;background:rgba(255,255,255,.06);border:1px solid var(--line);padding:3px 10px;border-radius:20px;color:var(--muted)}
.buy{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;padding-top:13px;border-top:1px solid var(--line)}
.price strong{font-size:1.05rem;color:var(--gold)}
.usd{font-size:.74rem;color:var(--muted);margin-inline-start:7px}
.btn{background:var(--gold);color:#12151c;font-weight:700;padding:9px 26px;border-radius:10px;text-decoration:none;font-size:.88rem}
.prev{display:block;text-align:center;margin-top:10px;font-size:.78rem;color:#3498db;text-decoration:none}
.empty{color:var(--muted);text-align:center;padding:36px 0;font-size:.88rem}
footer{border-top:1px solid var(--line);margin-top:34px;padding:24px 16px;text-align:center}
.badge{display:inline-flex;align-items:center;gap:9px;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:10px 20px;text-decoration:none;color:var(--text);font-size:.85rem}
.badge b{color:var(--gold)}
.badge-note{color:var(--muted);font-size:.72rem;margin-top:11px}
.chips{display:flex;gap:7px;justify-content:center;flex-wrap:wrap;margin-top:12px}
.chip{font-size:.72rem;background:rgba(255,255,255,.05);border:1px solid var(--line);
padding:5px 13px;border-radius:20px;color:var(--muted)}
.chip b{color:var(--gold);font-weight:700}
.cover.gen{height:150px;display:flex;flex-direction:column;align-items:center;
justify-content:center;gap:9px;position:relative;overflow:hidden}
.cover.gen::after{content:"";position:absolute;inset:0;
background:radial-gradient(circle at 30% 20%,rgba(255,255,255,.22),transparent 60%)}
.gen-ic{font-size:44px;filter:drop-shadow(0 3px 8px rgba(0,0,0,.35));z-index:1}
.gen-t{font-size:.8rem;font-weight:700;color:#fff;text-align:center;padding:0 18px;
text-shadow:0 2px 6px rgba(0,0,0,.45);z-index:1;line-height:1.4}
.trust{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:22px}
.ti{background:var(--panel);border:1px solid var(--line);border-radius:12px;
padding:13px 7px;text-align:center}
.ti span{font-size:20px;display:block}
.ti b{display:block;font-size:.76rem;margin:5px 0 3px}
.ti i{font-style:normal;font-size:.65rem;color:var(--muted);line-height:1.4;display:block}
.tbar{display:flex;align-items:center;justify-content:space-between;gap:12px;
padding:11px 16px;background:rgba(13,15,20,.92);border-bottom:1px solid var(--line);
position:sticky;top:0;z-index:20;backdrop-filter:blur(8px)}
.brand{display:flex;align-items:center;gap:5px;text-decoration:none}
.logo{font-size:1.05rem;font-weight:800;color:var(--gold);letter-spacing:.5px}
.dot{color:var(--gold);font-size:.7rem}
.tcta{font-size:.76rem;color:var(--text);border:1px solid var(--line);
border-radius:999px;padding:6px 15px;text-decoration:none}
.sell{background:linear-gradient(160deg,rgba(201,168,76,.13),var(--panel));
border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-top:32px;padding:32px 16px}
.sell-in{max-width:560px;margin:0 auto;text-align:center}
.sell-ic{font-size:34px}
.sell-t{font-size:1.22rem;margin:8px 0 10px;color:var(--text)}
.sell-p{color:var(--muted);font-size:.87rem;margin:0 0 16px}
.sell-p b{color:var(--gold)}
.sell-l{list-style:none;padding:0;margin:0 0 20px;text-align:start;display:inline-block}
.sell-l li{font-size:.83rem;color:var(--muted);padding:5px 0}
.sell-l li::before{content:"✓";color:var(--gold);font-weight:700;margin-inline-end:9px}
.sell-btn{display:block;background:var(--gold);color:#12151c;font-weight:800;
padding:14px;border-radius:12px;text-decoration:none;font-size:.95rem}
.sell-n{color:var(--muted);font-size:.72rem;margin-top:10px}
</style>
</head>
<body>

<!-- شريط تاجر: الزائر يعرف أنه داخل المنصّة -->
<nav class="tbar">
  <a class="brand" href="${SITE}/?from=store&s=${esc(s.slug)}">
    <span class="logo">تاجر</span><span class="dot">✦</span>
  </a>
  <a class="tcta" href="${SITE}/?from=store&s=${esc(s.slug)}">افتح المنصّة</a>
</nav>

<header>
  ${s.avatar_url ? `<img class="avatar" src="${esc(s.avatar_url)}" alt="${esc(s.display_name)}">` : ''}
  <h1>${esc(s.display_name)}</h1>
  ${s.bio ? `<p class="bio">${esc(s.bio)}</p>` : ''}
  <div class="meta">عضو منذ ${new Date(s.created_at).getFullYear()}</div>
  <div class="chips">
    <span class="chip"><b>${products.length}</b> منتج</span>
    ${s.total_sales_count > 0 ? `<span class="chip"><b>${s.total_sales_count}</b> عملية بيع</span>` : ''}
    <span class="chip">✅ متجر موثّق</span>
  </div>
  ${links ? `<div class="links">${links}</div>` : ''}
</header>

<div class="wrap">
  <div class="trust">
    <div class="ti"><span>⚡</span><b>تسليم فوري</b><i>الملف يصلك بعد الدفع مباشرة</i></div>
    <div class="ti"><span>🔒</span><b>دفع آمن</b><i>بطاقة الذهبية / CIB أو USDT</i></div>
    <div class="ti"><span>♾️</span><b>ملكية دائمة</b><i>حمّله متى شئت لمدة 30 يوماً</i></div>
  </div>

  <p class="sec">المنتجات (${products.length})</p>
  ${cards}
</div>

<!-- دعوة البيع: هذه هي الحلقة التي تُنمّي السوق.
     الرابط يحمل كود إحالة البائع، فمن يسجّل منه يُنسب له. -->
<section class="sell">
  <div class="sell-in">
    <div class="sell-ic">💰</div>
    <h2 class="sell-t">بِع منتجاتك الرقمية واربح</h2>
    <p class="sell-p">
      عندك دليل أو قالب أو دورة؟ اعرضها على تاجر واحتفظ بـ<b>70%</b> من كل عملية بيع.
      نعطيك صفحة متجر خاصة بك مثل هذه، ونتكفّل بالدفع والتسليم.
    </p>
    <ul class="sell-l">
      <li>صفحة متجر بعنوان خاص يظهر في جوجل</li>
      <li>الدفع بالبطاقة الجزائرية أو USDT</li>
      <li>تحويل أرباحك على CCP أو BaridiMob</li>
      <li>بلا رسوم اشتراك — تدفع فقط عند البيع</li>
    </ul>
    <a class="sell-btn" href="${esc(s.badge_url)}">ابدأ البيع مجاناً</a>
    <p class="sell-n">مجاني بالكامل · تحتاج دقيقتين للتسجيل</p>
  </div>
</section>

<footer>
  <a class="badge" href="${esc(s.badge_url)}">
    <span>مدعوم بواسطة</span><b>تاجر</b>
  </a>
  <p class="badge-note">منصّة عربية للمنتجات الرقمية وأدوات التجارة الإلكترونية</p>
</footer>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // كاش على الحافة مع إعادة تحقّق — الصفحة سريعة والتحديث يظهر خلال دقيقة
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
  res.status(200).send(html);
                    }
