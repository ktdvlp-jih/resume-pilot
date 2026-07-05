#!/usr/bin/env node
/**
 * sessionStart — lightweight ResumePilot context.
 */
console.log(
  JSON.stringify({
    additional_context:
      'ResumePilot: RAG 자소서 플랫폼. Dev=터미널(RUNNING.md), Prod=Docker(SETUP.md Part3). DEPLOY_HOST는 .env만.',
  }),
);
process.exit(0);
