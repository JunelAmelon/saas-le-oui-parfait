type Cta = { label: string; url: string };

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildBrandedEmail(params: {
  appName: string;
  baseUrl: string;
  title: string;
  text?: string;
  cta?: Cta;
}) {
  const appName = params.appName || 'leouiparfait';
  const baseUrl = params.baseUrl || '';
  const title = params.title || 'Notification';
  const text = (params.text || '').trim();
  const cta = params.cta;

  const brandPurple = '#88B7B5';
  const brandTurquoise = '#21C7B7';
  const bg = '#F6F4F1';

  const logoUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/logo-horizontal.png` : '';

  const textHtml = text
    ? `<div style="font-size:14px; line-height:1.6; color:#374151; white-space:pre-line;">${escapeHtml(text)}</div>`
    : '';

  const ctaHtml = cta
    ? `<div style="margin-top:18px;">
         <a href="${escapeHtml(cta.url)}" style="display:inline-block; background:${brandTurquoise}; color:#ffffff; text-decoration:none; padding:12px 18px; border-radius:10px; font-weight:700;">
           ${escapeHtml(cta.label)}
         </a>
       </div>
       <div style="margin-top:14px; font-size:12px; color:#6B7280;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br />
         <a href="${escapeHtml(cta.url)}" style="color:${brandPurple}; text-decoration:underline;">${escapeHtml(cta.url)}</a>
       </div>`
    : '';

  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0; padding:0; background:${bg};">
    <div style="max-width:640px; margin:0 auto; padding:28px 16px;">
      <div style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 20px rgba(17,24,39,0.08);">
        <div style="padding:18px 22px; background:${brandPurple};">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <div style="color:#ffffff; font-weight:800; font-size:16px; letter-spacing:0.2px;">${escapeHtml(appName)}</div>
          </div>
        </div>

        <div style="padding:22px;">
          ${logoUrl ? `<div style="text-align:center; margin-bottom:14px;"><img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(appName)}" style="max-width:220px; height:auto;" /></div>` : ''}
          <h1 style="margin:0 0 12px 0; font-size:20px; color:#111827;">${escapeHtml(title)}</h1>
          ${textHtml}
          ${ctaHtml}
        </div>

        <div style="padding:14px 22px; background:#FAFAFA; border-top:1px solid #EEE; font-size:12px; color:#6B7280;">
          Cet email a été envoyé automatiquement par ${escapeHtml(appName)}.
        </div>
      </div>
    </div>
  </body>
</html>`;

  return { html };
}
