export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, image_size } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt manquant' });

  try {
    const falRes = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Key ' + process.env.FAL_API_KEY,
      },
      body: JSON.stringify({
        prompt,
        image_size: image_size || '1:1',
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
      })
    });

    if (!falRes.ok) {
      const err = await falRes.text();
      return res.status(falRes.status).json({ error: err });
    }

    const data = await falRes.json();
    const imgUrl = data.images?.[0]?.url;
    if (!imgUrl) return res.status(500).json({ error: 'Pas d\'image retournée' });

    return res.status(200).json({ url: imgUrl });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
