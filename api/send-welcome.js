export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { clientEmail, commerceName } = req.body;

  if (!clientEmail) return res.status(400).json({ error: 'Email manquant' });

  const name = commerceName || 'votre commerce';

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">

    <!-- Header -->
    <div style="background:#120e08;border-radius:16px 16px 0 0;padding:32px;text-align:center">
      <div style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#f5f0e8;letter-spacing:-.3px">
        Repu<em style="font-style:italic;color:#d4a840">Agent</em>
      </div>
      <div style="font-size:11px;color:#6b5e48;letter-spacing:2px;text-transform:uppercase;margin-top:6px">Smart Link France</div>
      <div style="margin-top:20px;background:#1e1810;border-radius:10px;padding:14px 20px;display:inline-block">
        <div style="font-size:13px;color:#d4a840;font-weight:700">🎉 Bienvenue sur RepuAgent !</div>
        <div style="font-size:11px;color:#6b5e48;margin-top:4px">Votre essai gratuit de 14 jours a commencé</div>
      </div>
    </div>

    <!-- Content -->
    <div style="background:#fff;padding:36px 32px;border-left:1px solid #e8dfc8;border-right:1px solid #e8dfc8">

      <p style="font-size:15px;color:#1a1208;margin:0 0 8px;font-weight:700">Bonjour et bienvenue !</p>
      <p style="font-size:14px;color:#3d3020;line-height:1.7;margin:0 0 28px">
        Votre compte RepuAgent pour <strong>${name}</strong> est prêt. 
        Vous avez <strong>14 jours gratuits</strong> pour découvrir comment l'IA peut gérer vos avis Google à votre place.
      </p>

      <!-- 3 étapes onboarding -->
      <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b5e48;margin-bottom:16px">
        3 étapes pour démarrer
      </div>

      <!-- Étape 1 -->
      <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:20px;padding:16px;background:#faf8f4;border-radius:10px;border:1px solid #e8dfc8">
        <div style="width:32px;height:32px;background:#c8882a;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:Georgia,serif;font-size:15px;font-weight:700;color:#fff;text-align:center;line-height:32px">1</div>
        <div>
          <div style="font-size:14px;font-weight:700;color:#1a1208;margin-bottom:4px">Connectez votre fiche Google</div>
          <div style="font-size:12px;color:#6b5e48;line-height:1.6">Dans Paramètres IA, recherchez votre établissement pour lier votre fiche Google Business en 2 minutes.</div>
        </div>
      </div>

      <!-- Étape 2 -->
      <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:20px;padding:16px;background:#faf8f4;border-radius:10px;border:1px solid #e8dfc8">
        <div style="width:32px;height:32px;background:#c8882a;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:Georgia,serif;font-size:15px;font-weight:700;color:#fff;text-align:center;line-height:32px">2</div>
        <div>
          <div style="font-size:14px;font-weight:700;color:#1a1208;margin-bottom:4px">Générez votre première réponse</div>
          <div style="font-size:12px;color:#6b5e48;line-height:1.6">Copiez un vrai avis Google dans le Générateur IA et regardez l'agent rédiger une réponse parfaite en 10 secondes.</div>
        </div>
      </div>

      <!-- Étape 3 -->
      <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:28px;padding:16px;background:#faf8f4;border-radius:10px;border:1px solid #e8dfc8">
        <div style="width:32px;height:32px;background:#c8882a;border-radius:50%;display:flex;align-items:center;justify-content:justify;flex-shrink:0;font-family:Georgia,serif;font-size:15px;font-weight:700;color:#fff;text-align:center;line-height:32px">3</div>
        <div>
          <div style="font-size:14px;font-weight:700;color:#1a1208;margin-bottom:4px">Créez vos modèles de réponses</div>
          <div style="font-size:12px;color:#6b5e48;line-height:1.6">Dans Mes Modèles, sauvegardez vos réponses types pour les réutiliser en 1 clic à chaque nouvel avis.</div>
        </div>
      </div>

      <!-- CTA principal -->
      <div style="text-align:center;margin-bottom:28px">
        <a href="https://agent.gosmartlink.app/dashboard.html" style="display:inline-block;background:#c8882a;color:#fff;text-decoration:none;padding:16px 40px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:.3px">
          Accéder à mon dashboard →
        </a>
      </div>

      <!-- Séparateur -->
      <div style="border-top:1px solid #e8dfc8;padding-top:20px;margin-top:4px">
        <div style="font-size:12px;color:#6b5e48;line-height:1.7">
          💬 <strong>Besoin d'aide ?</strong> Contactez-nous directement sur WhatsApp :<br>
          <a href="https://wa.me/33764467300" style="color:#c8882a;text-decoration:none;font-weight:700">+33 7 64 46 73 00</a>
          — on répond en moins de 2h.
        </div>
      </div>
    </div>

    <!-- Trial reminder -->
    <div style="background:#1e1810;padding:16px 32px;text-align:center;border-left:1px solid #2a2010;border-right:1px solid #2a2010">
      <div style="font-size:12px;color:#a89880;line-height:1.6">
        ⏳ Votre essai gratuit se termine dans <strong style="color:#d4a840">14 jours</strong>.<br>
        Après cette période, continuez avec RepuAgent Pro à <strong style="color:#d4a840">39€/mois</strong> sans engagement.
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#120e08;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center">
      <div style="font-size:11px;color:#6b5e48;line-height:1.8">
        Vous recevez cet email car vous venez de créer un compte RepuAgent.<br>
        <a href="https://agent.gosmartlink.app/dashboard.html" style="color:#d4a840;text-decoration:none">Mon dashboard</a> ·
        <a href="https://agent.gosmartlink.app/confidentialite.html" style="color:#d4a840;text-decoration:none">Confidentialité</a> ·
        <a href="https://agent.gosmartlink.app" style="color:#d4a840;text-decoration:none">RepuAgent</a>
        <br><span style="color:#3d2800;margin-top:4px;display:block">Smart Link France · agent.gosmartlink.app</span>
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
        subject: `🎉 Bienvenue sur RepuAgent — votre essai gratuit a commencé !`,
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
    console.error('Welcome email error:', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
