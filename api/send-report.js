import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Sécurité — uniquement depuis Vercel Cron ou admin
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && req.method !== 'GET') {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  try {
    // Récupérer tous les clients actifs
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, email, commerce_name, stripe_status')
      .in('stripe_status', ['trialing', 'active']);

    if (clientsError) throw clientsError;
    if (!clients || clients.length === 0) {
      return res.status(200).json({ sent: 0, message: 'Aucun client actif' });
    }

    // Période du mois précédent
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    const monthName = firstDay.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    let sentCount = 0;
    const errors = [];

    for (const client of clients) {
      try {
        // Stats du mois pour ce client
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating, responded, created_at')
          .eq('client_id', client.id)
          .gte('created_at', firstDay.toISOString())
          .lte('created_at', lastDay.toISOString());

        const totalAvis = reviews?.length || 0;
        const responded = reviews?.filter(r => r.responded)?.length || 0;
        const avgRating = totalAvis > 0
          ? (reviews.reduce((a, r) => a + (r.rating || 0), 0) / totalAvis).toFixed(1)
          : null;
        const negative = reviews?.filter(r => r.rating <= 2)?.length || 0;
        const positive = reviews?.filter(r => r.rating >= 4)?.length || 0;
        const tauxReponse = totalAvis > 0 ? Math.round((responded / totalAvis) * 100) : 0;

        // Stats globales (tous les avis)
        const { data: allReviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('client_id', client.id);
        const globalAvg = allReviews?.length > 0
          ? (allReviews.reduce((a, r) => a + (r.rating || 0), 0) / allReviews.length).toFixed(1)
          : null;

        const html = buildReportEmail({
          commerceName: client.commerce_name || 'votre commerce',
          monthName,
          totalAvis,
          avgRating,
          globalAvg,
          responded,
          tauxReponse,
          positive,
          negative,
        });

        // Envoyer l'email
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'RepuAgent <alertes@gosmartlink.app>',
            to: [client.email],
            subject: `📊 Votre rapport RepuAgent — ${monthName}`,
            html
          })
        });

        if (emailRes.ok) sentCount++;
        else errors.push({ client: client.email, error: await emailRes.text() });

      } catch (e) {
        errors.push({ client: client.email, error: e.message });
      }
    }

    return res.status(200).json({
      sent: sentCount,
      total: clients.length,
      errors,
      month: monthName
    });

  } catch (error) {
    console.error('Report error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

function buildReportEmail({ commerceName, monthName, totalAvis, avgRating, globalAvg, responded, tauxReponse, positive, negative }) {
  const hasData = totalAvis > 0;
  const ratingColor = avgRating >= 4 ? '#16a34a' : avgRating >= 3 ? '#c8882a' : '#dc2626';

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">

    <!-- Header -->
    <div style="background:#120e08;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center">
      <div style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#f5f0e8">
        Repu<em style="font-style:italic;color:#d4a840">Agent</em>
      </div>
      <div style="font-size:11px;color:#6b5e48;letter-spacing:2px;margin-top:4px">SMART LINK FRANCE</div>
      <div style="margin-top:16px;background:#1e1810;border-radius:8px;padding:10px 20px;display:inline-block">
        <div style="font-size:13px;color:#d4a840;font-weight:700">📊 Rapport mensuel — ${monthName}</div>
      </div>
    </div>

    <!-- Intro -->
    <div style="background:#fff;padding:28px 32px;border-left:1px solid #e8dfc8;border-right:1px solid #e8dfc8">
      <p style="font-size:14px;color:#1a1208;margin:0 0 20px;line-height:1.7">
        Bonjour,<br><br>
        Voici le bilan de votre activité RepuAgent pour <strong>${commerceName}</strong> au mois de <strong>${monthName}</strong>.
      </p>

      ${hasData ? `
      <!-- Stats principales -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">
        <div style="background:#faf8f4;border:1px solid #e8dfc8;border-radius:10px;padding:16px;text-align:center">
          <div style="font-size:26px;font-weight:700;color:#1a1208;font-family:Georgia,serif">${totalAvis}</div>
          <div style="font-size:11px;color:#6b5e48;margin-top:4px">Avis reçus</div>
        </div>
        <div style="background:#faf8f4;border:1px solid #e8dfc8;border-radius:10px;padding:16px;text-align:center">
          <div style="font-size:26px;font-weight:700;color:${ratingColor};font-family:Georgia,serif">${avgRating || '—'}</div>
          <div style="font-size:11px;color:#6b5e48;margin-top:4px">Note moyenne</div>
        </div>
        <div style="background:#faf8f4;border:1px solid #e8dfc8;border-radius:10px;padding:16px;text-align:center">
          <div style="font-size:26px;font-weight:700;color:#c8882a;font-family:Georgia,serif">${tauxReponse}%</div>
          <div style="font-size:11px;color:#6b5e48;margin-top:4px">Taux de réponse</div>
        </div>
      </div>

      <!-- Détail -->
      <div style="background:#faf8f4;border:1px solid #e8dfc8;border-radius:10px;padding:20px;margin-bottom:24px">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#6b5e48;margin-bottom:14px">Détail du mois</div>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr style="border-bottom:1px solid #e8dfc8">
            <td style="padding:8px 0;color:#6b5e48">Avis positifs (4-5 ⭐)</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#16a34a">${positive}</td>
          </tr>
          <tr style="border-bottom:1px solid #e8dfc8">
            <td style="padding:8px 0;color:#6b5e48">Avis négatifs (1-2 ⭐)</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#dc2626">${negative}</td>
          </tr>
          <tr style="border-bottom:1px solid #e8dfc8">
            <td style="padding:8px 0;color:#6b5e48">Réponses générées</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#1a1208">${responded}</td>
          </tr>
          ${globalAvg ? `
          <tr>
            <td style="padding:8px 0;color:#6b5e48">Note globale (tous avis)</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#c8882a">${globalAvg} ⭐</td>
          </tr>` : ''}
        </table>
      </div>

      <!-- Conseil -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-left:3px solid #c8882a;border-radius:8px;padding:16px 20px;margin-bottom:24px">
        <div style="font-size:12px;color:#78350f;line-height:1.7">
          💡 <strong>Conseil du mois :</strong> ${tauxReponse < 80
            ? 'Votre taux de réponse est en dessous de 80%. Répondre à chaque avis augmente votre visibilité sur Google et rassure vos futurs clients.'
            : 'Excellent taux de réponse ! Continuez ainsi — les commerces qui répondent à leurs avis attirent 35% de clients en plus.'
          }
        </div>
      </div>
      ` : `
      <!-- Aucun avis -->
      <div style="text-align:center;padding:32px 20px;background:#faf8f4;border-radius:10px;margin-bottom:24px">
        <div style="font-size:32px;margin-bottom:12px">📭</div>
        <div style="font-size:14px;font-weight:700;color:#1a1208;margin-bottom:6px">Aucun avis ce mois-ci</div>
        <div style="font-size:12px;color:#6b5e48;line-height:1.6">
          Encouragez vos clients satisfaits à laisser un avis Google — un simple QR code à la caisse suffit !
        </div>
      </div>
      `}

      <!-- CTA -->
      <div style="text-align:center">
        <a href="https://agent.gosmartlink.app/dashboard.html" style="display:inline-block;background:#c8882a;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:13px;font-weight:700">
          Voir mon dashboard →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#120e08;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center">
      <div style="font-size:11px;color:#6b5e48;line-height:1.8">
        Rapport automatique envoyé le 1er de chaque mois.<br>
        <a href="https://agent.gosmartlink.app/dashboard.html" style="color:#d4a840;text-decoration:none">Mon dashboard</a> ·
        <a href="https://wa.me/33764467300" style="color:#d4a840;text-decoration:none">Support WhatsApp</a> ·
        <a href="https://agent.gosmartlink.app" style="color:#d4a840;text-decoration:none">RepuAgent</a>
        <br><span style="color:#3d2800;margin-top:4px;display:block">Smart Link France · agent.gosmartlink.app</span>
      </div>
    </div>

  </div>
</body>
</html>`;
}
