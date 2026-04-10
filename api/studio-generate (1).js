export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { promptFr, style, format } = req.body;
  if (!promptFr) return res.status(400).json({ error: 'Prompt manquant' });

  const S_STYLES = {
    photorealistic: 'professional food photography, photorealistic, 8k, sharp focus, natural lighting, commercial quality',
    cinematic: 'cinematic lighting, dramatic shadows, movie still quality, depth of field',
    luxury: 'luxury editorial style, gold accents, premium quality, high-end commercial photography',
    warm: 'warm cozy lighting, golden hour, soft bokeh, inviting atmosphere, lifestyle photography'
  };

  const S_SIZES = { square: '1:1', portrait: '9:16', landscape: '16:9' };

  try {
    // 1 — Claude optimise le prompt + génère la légende
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `Expert marketing commerce local français.
Description : "${promptFr}"
Style : ${style || 'photorealistic'}

Génère en JSON valide uniquement (sans markdown) :
{"image_prompt":"prompt anglais optimisé pour FLUX AI, très descriptif, 80 mots max, no text, no watermark","caption":"légende française 60-80 mots avec émojis pour les réseaux sociaux"}`
        }]
      })
    });

    const claudeData = await claudeRes.json();
    const raw = claudeData.content?.[0]?.text || '{}';
    let parsed = {};
    try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); } catch {}

    const imagePrompt = (parsed.image_prompt || promptFr) + ', ' + (S_STYLES[style] || S_STYLES.photorealistic) + ', no text, no watermark, no logo';
    const caption = parsed.caption || '';

    // 2 — fal.ai génère l'image
    const falRes = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Key ' + process.env.FAL_API_KEY,
      },
      body: JSON.stringify({
        prompt: imagePrompt,
        image_size: S_SIZES[format] || '1:1',
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
      })
    });

    if (!falRes.ok) {
      const err = await falRes.text();
      return res.status(500).json({ error: 'fal.ai error: ' + err });
    }

    const falData = await falRes.json();
    console.log('fal.ai response:', JSON.stringify(falData).slice(0, 200));
    const imgUrl = falData.images?.[0]?.url;
    if (!imgUrl) return res.status(500).json({ error: 'Aucune image generee', falData });

    return res.status(200).json({ url: imgUrl, caption });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
