#!/usr/bin/env node
/**
 * beforeShellExecution — block dangerous git/env operations.
 * stdin: { command: string, ... }
 * stdout: { permission: "allow"|"deny"|"ask", user_message?, agent_message? }
 */
const chunks = [];
process.stdin.on('data', (d) => chunks.push(d));
process.stdin.on('end', () => {
  let input = {};
  try {
    input = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    console.log(JSON.stringify({ permission: 'allow' }));
    process.exit(0);
  }

  const cmd = (input.command || '').trim();

  const deny = (user_message, agent_message) => {
    console.log(JSON.stringify({ permission: 'deny', user_message, agent_message }));
    process.exit(0);
  };

  const ask = (user_message, agent_message) => {
    console.log(JSON.stringify({ permission: 'ask', user_message, agent_message }));
    process.exit(0);
  };

  // Force push to main/master
  if (/git\s+push\b/.test(cmd) && /--force|-f\b/.test(cmd) && /\b(main|master)\b/.test(cmd)) {
    deny(
      'main/master force push는 차단됩니다.',
      'Hook blocked force push to main/master.',
    );
  }

  // Stage secrets
  if (/git\s+add\b/.test(cmd) && /\.env(\.|$)|credentials|\.pem|id_rsa/.test(cmd)) {
    ask(
      '`.env` 또는 비밀 파일이 git add에 포함될 수 있습니다. 계속할까요?',
      'Hook flagged git add that may include secrets.',
    );
  }

  // Hard reset
  if (/git\s+reset\s+--hard/.test(cmd)) {
    ask('git reset --hard는 되돌리기 어렵습니다. 정말 실행할까요?', 'Hook flagged git reset --hard.');
  }

  console.log(JSON.stringify({ permission: 'allow' }));
  process.exit(0);
});
