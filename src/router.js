const express = require('express');
const router = express.Router();
const axios = require('axios');
const engine = require('./engine');
const { createStripeSession } = require('./identity/stripe');
const { createOnfidoApplicant, createOnfidoCheck } = require('./identity/onfido');

/**
 * POST /api/oauth/exchange
 * Exchanges a GitHub OAuth code for an access_token.
 * Replaces the Cloudflare Worker — runs entirely on Railway.
 * Body: { code }
 */
router.post('/oauth/exchange', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code is required.' });

  const clientId     = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'GitHub OAuth env vars not set on server.' });
  }

  try {
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      { client_id: clientId, client_secret: clientSecret, code },
      { headers: { Accept: 'application/json' } }
    );

    const data = response.data;
    if (data.error) return res.status(400).json({ error: data.error_description || data.error });

    res.json({ access_token: data.access_token, token_type: data.token_type, scope: data.scope });
  } catch (err) {
    console.error('OAuth exchange error:', err.message);
    res.status(500).json({ error: 'OAuth exchange failed.' });
  }
});

/**
 * POST /api/check
 * Run a full background check against all enabled public record providers.
 * Body: { firstName, lastName, state?, dob? }
 */
router.post('/check', async (req, res) => {
  const { firstName, lastName, state, dob } = req.body;
  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'firstName and lastName are required.' });
  }
  try {
    const results = await engine.runCheck({ firstName, lastName, state, dob });
    res.json({ success: true, results });
  } catch (err) {
    console.error('Check error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/verify/session
 * Create a KYC/identity verification session.
 * Body: { provider: 'stripe'|'onfido', userId, returnUrl? }
 */
router.post('/verify/session', async (req, res) => {
  const { provider, userId, returnUrl } = req.body;
  if (!provider || !userId) {
    return res.status(400).json({ error: 'provider and userId are required.' });
  }
  try {
    if (provider === 'stripe') {
      const session = await createStripeSession({ userId, returnUrl });
      return res.json({ success: true, session });
    }
    if (provider === 'onfido') {
      const applicant = await createOnfidoApplicant({ userId });
      return res.json({ success: true, applicant });
    }
    res.status(400).json({ error: `Unknown provider: ${provider}` });
  } catch (err) {
    console.error('Verify session error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/verify/onfido/check
 */
router.post('/verify/onfido/check', async (req, res) => {
  const { applicantId } = req.body;
  if (!applicantId) return res.status(400).json({ error: 'applicantId required.' });
  try {
    const check = await createOnfidoCheck(applicantId);
    res.json({ success: true, check });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
