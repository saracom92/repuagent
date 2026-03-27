const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  const session = event.data.object;

  try {
    switch (event.type) {

      // ✅ Paiement réussi → accès actif
      case 'invoice.paid': {
        const customerId = session.customer;
        await supabase
          .from('clients')
          .update({
            stripe_status: 'active',
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      // ❌ Paiement échoué → accès restreint
      case 'invoice.payment_failed': {
        const customerId = session.customer;
        await supabase
          .from('clients')
          .update({
            stripe_status: 'past_due',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      // 🔄 Abonnement créé → essai démarré
      case 'customer.subscription.created': {
        const customerId = session.customer;
        const status = session.status; // trialing ou active
        await supabase
          .from('clients')
          .update({
            stripe_status: status,
            stripe_customer_id: customerId,
            stripe_subscription_id: session.id,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      // 🔄 Abonnement mis à jour
      case 'customer.subscription.updated': {
        const customerId = session.customer;
        await supabase
          .from('clients')
          .update({
            stripe_status: session.status,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      // 🚫 Abonnement annulé → accès bloqué
      case 'customer.subscription.deleted': {
        const customerId = session.customer;
        await supabase
          .from('clients')
          .update({
            stripe_status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      // 🆕 Nouveau client Stripe → lier à Supabase via email
      case 'customer.created': {
        const email = session.email;
        const customerId = session.id;
        if (email) {
          await supabase
            .from('clients')
            .update({
              stripe_customer_id: customerId,
              stripe_status: 'trialing',
              updated_at: new Date().toISOString()
            })
            .eq('email', email);
        }
        break;
      }

      default:
        console.log(`Événement non géré : ${event.type}`);
    }

    return res.status(200).json({ received: true });

  } catch (err) {
    console.error('Erreur traitement webhook:', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
};

// Récupérer le body brut pour vérification signature Stripe
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(Buffer.from(data)));
    req.on('error', reject);
  });
}
