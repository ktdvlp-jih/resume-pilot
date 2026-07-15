#!/usr/bin/env node
/**
 * sessionStart — lightweight ResumePilot context.
 */
console.log(
  JSON.stringify({
    additional_context:
      'ResumePilot: RAG 자소서 플랫폼. Dev=터미널(실행-가이드.md), Prod=Docker(설치-가이드.md Part3). DEPLOY_HOST는 .env만.',
  }),
);
process.exit(0);
