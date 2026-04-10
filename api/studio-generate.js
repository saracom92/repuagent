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
    let imagePrompt = promptFr + ', ' + (S_STYLES[style] || S_STYLES.photorealistic) + ', no text, no watermark, no logo';
    let caption = '';

    // 1 — Claude optimise le prompt (non bloquant)
    try {
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
            content: `Expert marketing. Description: "${promptFr}". Reponds en JSON uniquement sans markdown: {"image_prompt":"english prompt for image AI max 80 words","caption":"french social media caption 60 words with emojis"}`
          }]
        })
      });
      if (claudeRes.ok) {
        const cd = await claudeRes.json();
        const raw = cd.content?.[0]?.text || '{}';
        try {
          const p = JSON.parse(raw.replace(/```json|```/g,'').trim());
          if (p.image_prompt) imagePrompt = p.image_prompt + ', ' + (S_STYLES[style] || S_STYLES.photorealistic) + ', no text, no watermark';
          if (p.caption) caption = p.caption;
        } catch(pe) { console.log('JSON parse error:', pe.message, 'raw:', raw.slice(0,100)); }
      } else {
        const errText = await claudeRes.text();
        console.log('Claude error:', claudeRes.status, errText.slice(0,200));
      }
    } catch(ce) { console.log('Claude fetch error:', ce.message); }

    // 2 — fal.ai génère l'image
    console.log('Calling fal.ai with prompt:', imagePrompt.slice(0,100));
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

    const falText = await falRes.text();
    console.log('fal status:', falRes.status, 'response:', falText.slice(0, 200));

    if (!falRes.ok) {
      return res.status(500).json({ error: 'fal.ai ' + falRes.status + ': ' + falText.slice(0,200) });
    }

    let falData;
    try { falData = JSON.parse(falText); } catch { return res.status(500).json({ error: 'fal parse error: ' + falText.slice(0,100) }); }

    const imgUrl = falData.images?.[0]?.url;
    if (!imgUrl) return res.status(500).json({ error: 'Pas URL image', raw: falText.slice(0,200) });

    return res.status(200).json({ url: imgUrl, caption });

  } catch (e) {
    console.error('studio-generate fatal:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
