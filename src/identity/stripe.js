const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create a Stripe Identity VerificationSession.
 * Returns a client_secret the frontend uses to launch the Stripe Identity flow.
 * Docs: https://stripe.com/docs/identity/verification-sessions
 *
 * Pricing: ~$1.50 per successful verification (test mode is free)
 */
async function createStripeSession({ userId, returnUrl = 'https://yourdomain.com/verified' }) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not set.');
  }

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

/**
 * Retrieve and parse a completed verification session.
 */
async function getStripeResult(sessionId) {
  const session = await stripe.identity.verificationSessions.retrieve(sessionId, {
    expand: ['verified_outputs'],
  });

  return {
    status: session.status,
    lastError: session.last_error,
    verifiedOutputs: session.verified_outputs || null,
  };
}

/**
 * Verify Stripe webhook signature — call this in your webhook endpoint.
 */
function constructStripeEvent(rawBody, sig) {
  return stripe.webhooks.constructEvent(
    rawBody,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

module.exports = { createStripeSession, getStripeResult, constructStripeEvent };
