const Stripe = require('stripe');

// Lazy init — don't crash on startup if STRIPE_SECRET_KEY is not set
let stripeClient = null;

function getClient() {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not set.');
    }
    stripeClient = Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

/**
 * Create a Stripe Identity VerificationSession.
 * Docs: https://stripe.com/docs/identity/verification-sessions
 * Pricing: ~$1.50 per successful verification (test mode is free)
 */
async function createStripeSession({ userId, returnUrl = 'https://5mil.github.io/bg-check-engine/' }) {
  const stripe = getClient();
  const session = await stripe.identity.verificationSessions.create({
    type: 'document',
    metadata: { userId },
    options: {
      document: {
        allowed_types: ['driving_license', 'passport', 'id_card'],
        require_id_number: false,
        require_live_capture: true,
        require_matching_selfie: true,
      },
    },
    return_url: returnUrl,
  });

  return {
    sessionId: session.id,
    clientSecret: session.client_secret,
    url: session.url,
    status: session.status,
  };
}

async function getStripeResult(sessionId) {
  const stripe = getClient();
  const session = await stripe.identity.verificationSessions.retrieve(sessionId, {
    expand: ['verified_outputs'],
  });
  return {
    status: session.status,
    lastError: session.last_error,
    verifiedOutputs: session.verified_outputs || null,
  };
}

function constructStripeEvent(rawBody, sig) {
  const stripe = getClient();
  return stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
}

module.exports = { createStripeSession, getStripeResult, constructStripeEvent };
