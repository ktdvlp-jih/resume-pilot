#!/usr/bin/env node
/**
 * SessionStart — lightweight ResumePilot context (Claude Code hook).
 * stdout: { hookSpecificOutput: { hookEventName, additionalContext } }
 */
console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext:
        'ResumePilot: RAG 자소서 플랫폼. Dev=터미널(docs/실행-가이드.md), Prod=Docker(docs/설치-가이드.md Part3). DEPLOY_HOST는 .env만.',
    },
  }),
);
process.exit(0);
