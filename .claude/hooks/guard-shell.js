#!/usr/bin/env node
/**
 * PreToolUse(Bash) — block dangerous git/env operations (Claude Code hook).
 * stdin: { tool_name, tool_input: { command } }
 * stdout: { hookSpecificOutput: { hookEventName, permissionDecision: "allow"|"deny"|"ask", permissionDecisionReason } }
 */
const chunks = [];
process.stdin.on('data', (d) => chunks.push(d));
process.stdin.on('end', () => {
  let input = {};
  try {
    input = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    decide('allow');
  }

  const cmd = ((input.tool_input && input.tool_input.command) || '').trim();

  // Force push to main/master
  if (/git\s+push\b/.test(cmd) && /--force|-f\b/.test(cmd) && /\b(main|master)\b/.test(cmd)) {
    decide('deny', 'main/master force push는 차단됩니다.');
  }

  // Stage secrets
  if (/git\s+add\b/.test(cmd) && /\.env(\.|$|\s)|credentials|\.pem|id_rsa/.test(cmd)) {
    decide('ask', '`.env` 또는 비밀 파일이 git add에 포함될 수 있습니다. 계속할까요?');
  }

  // Hard reset
  if (/git\s+reset\s+--hard/.test(cmd)) {
    decide('ask', 'git reset --hard는 되돌리기 어렵습니다. 정말 실행할까요?');
  }

  decide('allow');

  function decide(permissionDecision, reason) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision,
          ...(reason ? { permissionDecisionReason: reason } : {}),
        },
      }),
    );
    process.exit(0);
  }
});
