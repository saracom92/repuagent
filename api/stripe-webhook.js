export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

  // Lire le body brut
  const rawBody = await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

  // Vérifier la signature Stripe via l'API
  let event;
  try {
    // Vérification manuelle de la signature HMAC
    const crypto = await import('crypto');
    const parts = sig.split(',');
    const timestamp = parts.find(p => p.startsWith('t=')).split('=')[1];
    const signatures = parts.filter(p => p.startsWith('v1=')).map(p => p.split('=')[1]);
    
    const payload = `${timestamp}.${rawBody}`;
    const expected = crypto.default.createHmac('sha256', webhookSecret)
      .update(payload, 'utf8')
      .digest('hex');
    
    const isValid = signatures.some(s => s === expected);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    event = JSON.parse(rawBody);
  } catch (err) {
    console.error('Signature error:', err.message);
    return res.status(400).json({ error: err.message });
  }

  const session = event.data.object;

  // Helper pour mettre à jour Supabase
  async function updateClient(filter, data) {
    const params = new URLSearchParams(filter).toString();
    await fetch(`${SB_URL}/rest/v1/clients?${params}`, {
      method: 'PATCH',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ ...data, updated_at: new Date().toISOString() })
    });
  }

  try {
    switch (event.type) {

      case 'customer.created': {
        const email = session.email;
        const customerId = session.id;
        if (email) {
          await updateClient(
            { email: `eq.${email}` },
            { stripe_customer_id: customerId, stripe_status: 'trialing' }
          );
        }
        break;
      }

      case 'customer.subscription.created': {
        await updateClient(
          { stripe_customer_id: `eq.${session.customer}` },
          {
            stripe_status: session.status,
            stripe_subscription_id: session.id,
            stripe_customer_id: session.customer
          }
        );
        break;
      }

      case 'customer.subscription.updated': {
        await updateClient(
          { stripe_customer_id: `eq.${session.customer}` },
          { stripe_status: session.status }
        );
        break;
      }

      case 'customer.subscription.deleted': {
        await updateClient(
          { stripe_customer_id: `eq.${session.customer}` },
          { stripe_status: 'canceled' }
        );
        break;
      }

      case 'invoice.paid': {
        await updateClient(
          { stripe_customer_id: `eq.${session.customer}` },
          { stripe_status: 'active', stripe_customer_id: session.customer }
        );
        break;
      }

      case 'invoice.payment_failed': {
        await updateClient(
          { stripe_customer_id: `eq.${session.customer}` },
          { stripe_status: 'past_due' }
        );
        break;
      }

      default:
        console.log(`Événement non géré : ${event.type}`);
    }

    return res.status(200).json({ received: true });

  } catch (err) {
    console.error('Erreur webhook:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
