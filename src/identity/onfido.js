const { Onfido, Region } = require('@onfido/api');

const onfido = new Onfido({
  apiToken: process.env.ONFIDO_API_TOKEN || '',
  region: Region.US,
});

/**
 * Create an Onfido applicant.
 * Applicants are the subjects of identity checks.
 * Docs: https://documentation.onfido.com/#create-applicant
 *
 * Pricing: pay-per-check, sandbox is free.
 */
async function createOnfidoApplicant({ userId, firstName, lastName }) {
  if (!process.env.ONFIDO_API_TOKEN) {
    throw new Error('ONFIDO_API_TOKEN not set.');
  }

  const applicant = await onfido.applicant.create({
    firstName: firstName || 'Unknown',
    lastName: lastName || userId,
  });

  // Generate SDK token so frontend can launch the Onfido Smart Capture SDK
  const sdkToken = await onfido.sdkToken.generate({
    applicantId: applicant.id,
    referrer: '*://*/*',
  });

  return {
    applicantId: applicant.id,
    sdkToken: sdkToken.token,
  };
}

/**
 * Create an Onfido check on an existing applicant.
 * report_names options: document, facial_similarity_photo, identity_enhanced, watchlist_standard
 */
async function createOnfidoCheck(applicantId, reportNames = ['document', 'facial_similarity_photo']) {
  const check = await onfido.check.create({
    applicantId,
    reportNames,
  });

  return {
    checkId: check.id,
    status: check.status,
    reportIds: check.reportIds,
    resultsUri: check.resultsUri,
  };
}

/**
 * Retrieve a completed Onfido check result.
 */
async function getOnfidoResult(checkId) {
  const check = await onfido.check.find(checkId);
  const reports = await Promise.all(
    check.reportIds.map(id => onfido.report.find(id))
  );

  return {
    status: check.status,
    result: check.result,
    reports: reports.map(r => ({
      name: r.name,
      result: r.result,
      subResult: r.subResult,
      breakdown: r.breakdown,
    })),
  };
}

module.exports = { createOnfidoApplicant, createOnfidoCheck, getOnfidoResult };
