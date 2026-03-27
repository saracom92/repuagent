export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { commerceName, reviewerName, rating, reviewText, replyText, clientEmail } = req.body;

  if (!clientEmail || !rating) return res.status(400).json({ error: 'Données manquantes' });

  const stars = '⭐'.repeat(rating);
  const ratingColor = rating <= 2 ? '#dc2626' : '#ea580c';

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">

    <!-- Header -->
    <div style="background:#120e08;border-radius:16px 16px 0 0;padding:24px 32px;text-align:center">
      <div style="font-size:28px;margin-bottom:6px">⭐</div>
      <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#f5f0e8;letter-spacing:-.3px">
        Repu<em style="font-style:italic;color:#d4a840">Agent</em>
      </div>
      <div style="font-size:11px;color:#6b5e48;letter-spacing:2px;text-transform:uppercase;margin-top:4px">Smart Link France</div>
    </div>

    <!-- Alert banner -->
    <div style="background:${ratingColor};padding:16px 32px;text-align:center">
      <div style="font-size:13px;font-weight:700;color:#fff;letter-spacing:.5px">
        ⚠️ AVIS ${rating <= 2 ? 'NÉGATIF' : 'MITIGÉ'} REÇU — ACTION RECOMMANDÉE
      </div>
    </div>

    <!-- Content -->
    <div style="background:#fff;padding:32px;border-left:1px solid #e8dfc8;border-right:1px solid #e8dfc8">

      <p style="font-size:14px;color:#1a1208;margin:0 0 20px">
        Bonjour,<br><br>
        Un nouvel avis <strong style="color:${ratingColor}">${stars} (${rating}/5)</strong> vient d'être reçu pour <strong>${commerceName || 'votre commerce'}</strong>.
      </p>

      <!-- Avis -->
      <div style="background:#faf8f4;border:1px solid #e8dfc8;border-left:3px solid ${ratingColor};border-radius:8px;padding:16px 20px;margin-bottom:20px">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#6b5e48;margin-bottom:8px">Avis de ${reviewerName || 'Anonyme'}</div>
        <div style="font-size:14px;color:#1a1208;line-height:1.6;font-style:italic">"${reviewText || '(sans commentaire)'}"</div>
      </div>

      <!-- Réponse suggérée -->
      ${replyText ? `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:3px solid #16a34a;border-radius:8px;padding:16px 20px;margin-bottom:20px">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#16a34a;margin-bottom:8px">✅ Réponse suggérée par RepuAgent</div>
        <div style="font-size:14px;color:#1a1208;line-height:1.6">${replyText}</div>
      </div>
      <p style="font-size:12px;color:#6b5e48;margin:0 0 20px">Copiez cette réponse et publiez-la sur votre fiche Google Business pour montrer votre réactivité.</p>
      ` : ''}

      <!-- CTA -->
      <div style="text-align:center;margin:24px 0">
        <a href="https://agent.gosmartlink.app/dashboard.html" style="display:inline-block;background:linear-gradient(135deg,#b8882a,#d4a840);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:.3px">
          Voir mes avis → 
        </a>
      </div>

      <div style="border-top:1px solid #e8dfc8;padding-top:16px;margin-top:8px">
        <p style="font-size:12px;color:#6b5e48;line-height:1.6;margin:0">
          💡 <strong>Conseil :</strong> Répondre à un avis négatif dans les 24h augmente de 33% les chances que le client modifie sa note. Restez professionnel et proposez toujours un contact direct.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#120e08;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center">
      <div style="font-size:11px;color:#6b5e48;line-height:1.7">
        Vous recevez cet email car vous avez activé les alertes avis négatifs.<br>
        <a href="https://agent.gosmartlink.app/dashboard.html" style="color:#d4a840;text-decoration:none">Gérer mes alertes</a> · 
        <a href="https://agent.gosmartlink.app" style="color:#d4a840;text-decoration:none">RepuAgent</a> · Smart Link France
      </div>
    </div>

  </div>
</body>
</html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'RepuAgent <alertes@gosmartlink.app>',
        to: [clientEmail],
        subject: `⚠️ Avis ${rating}⭐ reçu — ${commerceName || 'votre commerce'} — Action recommandée`,
        html
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend error:', data);
      return res.status(response.status).json({ error: data.message || 'Erreur envoi email' });
    }

    return res.status(200).json({ sent: true, id: data.id });

  } catch (error) {
    console.error('Alert error:', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
