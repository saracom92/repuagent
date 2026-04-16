export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prenom, nom, email, tel, activite, clients, source } = req.body;
  if (!email || !prenom) return res.status(400).json({ error: 'Champs manquants' });

  // Générer un code promo unique basé sur le nom
  const code = nom.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z]/g,'').slice(0,8);

  try {
    // 1 — Créer le compte Supabase de l'affilié via API admin
    const sbAdmin = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({
        email,
        email_confirm: false, // Va envoyer l'email de confirmation
        user_metadata: { prenom, nom, code }
      })
    });

    const sbData = await sbAdmin.json();
    const userId = sbData.id;

    // 2 — Insérer dans la table affiliates
    if (userId) {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/affiliates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_KEY
        },
        body: JSON.stringify({
          id: userId,
          email, prenom, nom, code,
          activite: activite || '',
          active: true
        })
      });

      // 3 — Envoyer email invitation Supabase pour créer le mot de passe
      await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_KEY
        },
        body: JSON.stringify({ email_confirm: true })
      });

      // Envoyer le magic link pour définir le mot de passe
      await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/generate_link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_KEY
        },
        body: JSON.stringify({
          type: 'invite',
          email,
          redirect_to: 'https://agent.gosmartlink.app/affilie.html'
        })
      });
    }

    // 4 — Email admin
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'RepuAgent <alertes@gosmartlink.app>',
        to: ['amourimustapha01@gmail.com'],
        subject: `🤝 Nouveau affilié créé : ${prenom} ${nom} — Code : ${code}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px">
          <h2 style="color:#c8882a">Nouvel affilié inscrit</h2>
          <p><strong>Nom :</strong> ${prenom} ${nom}</p>
          <p><strong>Email :</strong> ${email}</p>
          <p><strong>Téléphone :</strong> ${tel || 'Non renseigné'}</p>
          <p><strong>Activité :</strong> ${activite}</p>
          <p><strong>Clients potentiels :</strong> ${clients || 'Non renseigné'}</p>
          <p><strong>Source :</strong> ${source || 'Non renseigné'}</p>
          <hr style="border-color:#e8dfc8;margin:16px 0">
          <p style="background:#fef8ec;padding:14px;border-radius:8px;border:1px solid #fde880">
            <strong>Code promo à créer dans Stripe :</strong><br>
            Nom : <strong style="font-size:20px;color:#c8882a">${code}</strong><br>
            Type : 100% · Durée : Une fois
          </p>
          <p style="color:#6b5e48;font-size:12px">Le compte affilié a été créé automatiquement dans Supabase. L'affilié a reçu un email pour définir son mot de passe.</p>
        </div>`
      })
    });

    // 5 — Email confirmation affilié avec son code
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
        html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0c0a07;color:#f5f0e8;border-radius:12px">
          <h2 style="color:#d4a840;font-family:Georgia,serif">Bienvenue ${prenom} !</h2>
          <p style="color:#a89880;margin:12px 0">Votre candidature a été acceptée. Voici toutes les informations pour démarrer.</p>
          <div style="background:#1a1510;border:1px solid rgba(200,136,42,.3);border-radius:10px;padding:20px;margin:20px 0;text-align:center">
            <div style="font-size:11px;color:#6b5e48;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Votre code promo</div>
            <div style="font-family:Georgia,serif;font-size:36px;font-weight:700;color:#c8882a;letter-spacing:3px">${code}</div>
            <div style="font-size:12px;color:#6b5e48;margin-top:8px">1er mois offert pour vos clients · 8,70€/mois pour vous dès le 2ème mois</div>
          </div>
          <p style="color:#a89880;font-size:13px;line-height:1.7">Vous allez recevoir un second email de notre part pour <strong style="color:#f5f0e8">créer votre mot de passe</strong> et accéder à votre espace affilié.</p>
          <a href="https://agent.gosmartlink.app/affilie.html" style="display:block;background:#c8882a;color:#0c0a07;padding:14px;border-radius:8px;text-align:center;text-decoration:none;font-weight:700;margin:20px 0">Accéder à mon espace affilié →</a>
          <p style="color:#6b5e48;font-size:11px;text-align:center">Questions ? WhatsApp : +33 7 64 46 73 00</p>
        </div>`
      })
    });

    return res.status(200).json({ ok: true, code });

  } catch(e) {
    console.error('send-affiliation error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
