export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code manquant' });

  try {
    // Récupérer tous les abonnements Stripe qui utilisent ce coupon
    const stripe = await fetch('https://api.stripe.com/v1/subscriptions?limit=100&status=active', {
      headers: {
        'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY,
      }
    });

    const stripeData = await stripe.json();
    const subscriptions = stripeData.data || [];

    // Filtrer les abonnements qui utilisent le coupon de cet affilié
    const affiliated = subscriptions.filter(sub => {
      const discount = sub.discount;
      return discount && discount.coupon && discount.coupon.name === code;
    });

    const activeClients = affiliated.length;
    const commissionPerClient = 8.70;
    const monthCommission = activeClients * commissionPerClient;

    // Calculer le total gagné depuis le début
    // On récupère aussi les abonnements annulés qui avaient ce coupon
    const cancelledRes = await fetch('https://api.stripe.com/v1/subscriptions?limit=100&status=canceled', {
      headers: { 'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY }
    });
    const cancelledData = await cancelledRes.json();
    const cancelledAffiliates = (cancelledData.data || []).filter(sub => {
      const discount = sub.discount;
      return discount && discount.coupon && discount.coupon.name === code;
    });

    // Calculer les mois actifs pour chaque abonnement annulé
    let totalFromCancelled = 0;
    for (const sub of cancelledAffiliates) {
      const start = new Date(sub.start_date * 1000);
      const end = new Date(sub.canceled_at * 1000);
      const months = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24 * 30)) - 1); // -1 car premier mois offert
      totalFromCancelled += months * commissionPerClient;
    }

    // Total = mois actifs actuels (estimation 1 mois) + historique annulés
    const totalEarned = totalFromCancelled + (activeClients * commissionPerClient);

    // Générer l'historique des 6 derniers mois
    const history = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const isCurrent = i === 0;

      // Compter les clients actifs ce mois
      const clientsThisMonth = affiliated.filter(sub => {
        const start = new Date(sub.start_date * 1000);
        return start <= d;
      }).length;

      if (clientsThisMonth > 0 || isCurrent) {
        history.push({
          month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          clients: isCurrent ? activeClients : clientsThisMonth,
          amount: (isCurrent ? activeClients : clientsThisMonth) * commissionPerClient,
          paid: !isCurrent
        });
      }
    }

    return res.status(200).json({
      activeClients,
      monthCommission,
      totalEarned,
      history: history.reverse().slice(0, 6)
    });

  } catch(e) {
    console.error('affiliate-stats error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
