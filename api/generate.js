const rateLimitMap = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60000;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record) { rateLimitMap.set(ip, { count: 1, start: now }); return true; }
  if (now - record.start > RATE_WINDOW) { rateLimitMap.set(ip, { count: 1, start: now }); return true; }
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.start > RATE_WINDOW) rateLimitMap.delete(ip);
  }
}, 300000);

// ── Contexte par type d'établissement ──
function getContextByType(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('pizza') || t.includes('italien')) return 'pizzeria italienne avec des pizzas fraîches et des pâtes maison';
  if (t.includes('sushi') || t.includes('asiatique') || t.includes('japonais')) return 'restaurant asiatique avec des sushis frais et des plats traditionnels';
  if (t.includes('kebab') || t.includes('oriental')) return 'restaurant oriental avec des viandes grillées et des recettes traditionnelles';
  if (t.includes('burger') || t.includes('fast')) return 'restaurant de burgers avec des produits frais et des recettes maison';
  if (t.includes('gastronomique')) return 'restaurant gastronomique avec une cuisine raffinée et des produits de saison';
  if (t.includes('brasserie') || t.includes('bistrot')) return 'brasserie conviviale avec une cuisine traditionnelle française';
  if (t.includes('boulangerie') || t.includes('patisserie')) return 'boulangerie-pâtisserie artisanale avec des produits faits maison chaque matin';
  if (t.includes('café') || t.includes('salon de thé')) return 'café accueillant avec une sélection de boissons chaudes et de pâtisseries';
  if (t.includes('coiffure')) return 'salon de coiffure avec des prestations soignées';
  if (t.includes('beauté') || t.includes('spa') || t.includes('bien-être')) return 'institut de beauté avec des soins personnalisés';
  if (t.includes('barbier')) return 'barbier traditionnel avec un service soigné';
  return 'commerce local avec un service de qualité';
}

// ── Instructions par note ──
function getInstructionsByRating(rating) {
  const r = parseInt(rating);
  if (r === 5) return `Remercie chaleureusement. Mentionne un élément spécifique de l'avis si possible. Invite à revenir. Maximum 3 phrases. Ton enthousiaste et reconnaissant.`;
  if (r === 4) return `Remercie sincèrement. Reconnais le point positif. Si une réserve est mentionnée, dis que vous travaillez à l'améliorer. Maximum 3 phrases. Ton professionnel et positif.`;
  if (r === 3) return `Remercie pour le retour. Reconnais qu'il y a eu une expérience mitigée. Dis que vous prenez en compte les retours pour vous améliorer. Invite à donner une nouvelle chance. Maximum 3 phrases. Ton constructif.`;
  if (r === 2) return `Remercie pour le retour malgré la déception. Exprime des regrets sincères. Propose de contacter directement l'établissement pour en discuter. Maximum 3 phrases. Ton professionnel et empathique.`;
  if (r === 1) return `Remercie pour le retour. Exprime des excuses sincères pour cette mauvaise expérience. Propose un contact direct (email ou téléphone) pour trouver une solution. Ne te défends pas. Maximum 3 phrases. Ton calme et professionnel.`;
  return 'Réponds de façon professionnelle et chaleureuse. Maximum 3 phrases.';
}

// ── Instructions par langue ──
function getLangInstruction(lang) {
  const l = (lang || '').toLowerCase();
  if (l.includes('arabe') || l === 'ar') return 'en arabe (langue arabe standard, pas de dialecte)';
  if (l.includes('anglais') || l === 'en') return 'en anglais';
  if (l.includes('espagnol') || l === 'es') return 'en espagnol';
  return 'en français';
}

// ── Ton de voix ──
function getToneInstruction(tone) {
  const t = (tone || '').toLowerCase();
  if (t.includes('professionnel')) return 'Utilise le vouvoiement. Ton professionnel et courtois.';
  if (t.includes('dynamique')) return 'Ton dynamique, moderne et enthousiaste. Peut utiliser 1 emoji maximum.';
  if (t.includes('artisanal')) return 'Ton artisanal, authentique et sincère. Parle avec passion de votre métier.';
  return 'Ton chaleureux et humain. Proche du client sans être familier.';
}

export default async function handler(req, res) {
  const allowedOrigins = ['https://agent.gosmartlink.app', 'https://repuagent.vercel.app'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  if (!checkRateLimit(ip)) return res.status(429).json({ error: 'Trop de requêtes. Attendez 1 minute.' });

  const { prompt, commerce, type, rating, reviewText, reviewerName, lang, tone } = req.body;

  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'Clé API non configurée.' });

  // ── Construire le prompt intelligent ──
  let finalPrompt;

  if (prompt && !commerce) {
    // Mode legacy — prompt direct
    if (typeof prompt !== 'string' || prompt.length > 2000) {
      return res.status(400).json({ error: 'Requête invalide.' });
    }
    finalPrompt = prompt;
  } else {
    // Mode intelligent avec contexte
    const ctx = getContextByType(type);
    const ratingInstr = getInstructionsByRating(rating);
    const langInstr = getLangInstruction(lang);
    const toneInstr = getToneInstruction(tone);

    finalPrompt = `Tu es le responsable de "${commerce || 'notre établissement'}", ${ctx}.

Un client a laissé un avis Google ${rating ? `(${rating}/5 étoiles)` : ''} :
- Client : ${reviewerName || 'un client'}
- Avis : "${reviewText || '(sans commentaire)'}"

Réponds à cet avis ${langInstr}.

Instructions importantes :
- ${ratingInstr}
- ${toneInstr}
- Ne révèle JAMAIS que tu es une intelligence artificielle
- Ne mets pas de guillemets autour de ta réponse
- N'invente pas d'informations que tu ne connais pas
- Ne commence pas par "Cher" ou "Chère"
- La réponse doit sembler écrite par un humain passionné par son métier`;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{ role: 'user', content: finalPrompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Erreur API' });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text;
    if (!reply) return res.status(500).json({ error: 'Réponse vide.' });
    return res.status(200).json({ reply });

  } catch (error) {
    console.error('Erreur generate:', error.message);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}
