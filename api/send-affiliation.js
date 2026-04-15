export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prenom, nom, email, tel, activite, clients, source } = req.body;
  if (!email || !prenom) return res.status(400).json({ error: 'Champs manquants' });

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#120e08;border-radius:16px 16px 0 0;padding:32px;text-align:center">
      <div style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#f5f0e8">
        Repu<em style="font-style:italic;color:#d4a840">Agent</em>
      </div>
      <div style="font-size:11px;color:#6b5e48;letter-spacing:2px;text-transform:uppercase;margin-top:6px">Nouvelle candidature affilié</div>
    </div>
    <div style="background:#fff;padding:36px 32px;border-left:1px solid #e8dfc8;border-right:1px solid #e8dfc8">
      <div style="font-size:15px;font-weight:700;color:#1a1208;margin-bottom:20px">🎉 Nouveau candidat affilié !</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="padding:10px 0;border-bottom:1px solid #e8dfc8;color:#6b5e48;width:40%">Nom</td><td style="padding:10px 0;border-bottom:1px solid #e8dfc8;font-weight:600;color:#1a1208">${prenom} ${nom}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e8dfc8;color:#6b5e48">Email</td><td style="padding:10px 0;border-bottom:1px solid #e8dfc8;font-weight:600;color:#c8882a">${email}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e8dfc8;color:#6b5e48">Téléphone</td><td style="padding:10px 0;border-bottom:1px solid #e8dfc8;font-weight:600;color:#1a1208">${tel || 'Non renseigné'}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e8dfc8;color:#6b5e48">Activité</td><td style="padding:10px 0;border-bottom:1px solid #e8dfc8;font-weight:600;color:#1a1208">${activite}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e8dfc8;color:#6b5e48">Clients potentiels</td><td style="padding:10px 0;border-bottom:1px solid #e8dfc8;font-weight:600;color:#1a1208">${clients || 'Non renseigné'}</td></tr>
        <tr><td style="padding:10px 0;color:#6b5e48">Source</td><td style="padding:10px 0;font-weight:600;color:#1a1208">${source || 'Non renseigné'}</td></tr>
      </table>
      <div style="margin-top:24px;padding:16px;background:#fef8ec;border-radius:10px;border:1px solid #fde880">
        <div style="font-size:12px;color:#6b5e48;margin-bottom:6px;font-weight:700">ACTION REQUISE</div>
        <div style="font-size:13px;color:#1a1208;line-height:1.6">Créer un code promo Stripe pour <strong>${prenom} ${nom}</strong> et envoyer par email à <strong>${email}</strong></div>
      </div>
    </div>
    <div style="background:#120e08;border-radius:0 0 16px 16px;padding:20px;text-align:center">
      <div style="font-size:11px;color:#6b5e48">RepuAgent · Programme Affiliés · agent.gosmartlink.app</div>
    </div>
  </div>
</body>
</html>`;

  try {
    // Email à l'admin
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'RepuAgent <alertes@gosmartlink.app>',
        to: ['amourimustapha01@gmail.com'],
        subject: `🤝 Nouveau candidat affilié : ${prenom} ${nom}`,
        html
      })
    });

    // Email de confirmation au candidat
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'RepuAgent <alertes@gosmartlink.app>',
        to: [email],
        subject: `Bienvenue dans le programme affilié RepuAgent !`,
        html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#120e08;border-radius:16px 16px 0 0;padding:32px;text-align:center">
      <div style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#f5f0e8">
        Repu<em style="font-style:italic;color:#d4a840">Agent</em>
      </div>
    </div>
    <div style="background:#fff;padding:36px 32px;border-left:1px solid #e8dfc8;border-right:1px solid #e8dfc8">
      <p style="font-size:15px;font-weight:700;color:#1a1208;margin-bottom:12px">Bonjour ${prenom} 👋</p>
      <p style="font-size:14px;color:#3d3020;line-height:1.7;margin-bottom:20px">
        Nous avons bien reçu votre candidature au programme affilié RepuAgent. Nous reviendrons vers vous sous <strong>24h</strong> avec votre code promo personnalisé et toutes les informations pour démarrer.
      </p>
      <div style="background:#fef8ec;border:1px solid #fde880;border-radius:12px;padding:20px;margin-bottom:20px">
        <div style="font-size:13px;font-weight:700;color:#c8882a;margin-bottom:8px">Votre commission</div>
        <div style="font-size:32px;font-weight:700;color:#c8882a;font-family:Georgia,serif">8,70€<span style="font-size:14px;color:#6b5e48;font-weight:400">/mois par client</span></div>
        <div style="font-size:12px;color:#6b5e48;margin-top:6px">30% sur 29€ · Récurrent · Sans limite</div>
      </div>
      <p style="font-size:13px;color:#6b5e48;line-height:1.7">En attendant, n'hésitez pas à tester RepuAgent sur <a href="https://agent.gosmartlink.app" style="color:#c8882a">agent.gosmartlink.app</a></p>
    </div>
    <div style="background:#120e08;border-radius:0 0 16px 16px;padding:20px;text-align:center">
      <div style="font-size:11px;color:#6b5e48">RepuAgent · Smart Link France · +33 7 64 46 73 00</div>
    </div>
  </div>
</body>
</html>`
      })
    });

    return res.status(200).json({ ok: true });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
