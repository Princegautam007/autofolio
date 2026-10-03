// Usage:
//   node scripts/validate-workflow.js
//   node scripts/validate-workflow.js --file workflows/autofolio.json
//
// Validates workflows/autofolio.json:
//   1. All nodes have id, name, type, position, parameters
//   2. All connections reference nodes that exist
//   3. No hardcoded secrets or tokens
//   4. Webhook node has authentication configured
// Prints PASS or FAIL with details. Exit code 0 on PASS, 1 on FAIL.
//
// Uses only Node.js built ins. No npm dependencies.

const fs = require('node:fs');
const path = require('node:path');

function getWorkflowPath(argv) {
  const idx = argv.indexOf('--file');
  if (idx !== -1 && argv[idx + 1]) {
    return path.resolve(process.cwd(), argv[idx + 1]);
  }
  return path.resolve(process.cwd(), 'workflows', 'autofolio.json');
}

function checkRequiredFields(nodes, errors) {
  const required = ['id', 'name', 'type', 'position', 'parameters'];
  for (const node of nodes) {
    for (const field of required) {
      if (node[field] === undefined || node[field] === null) {
        errors.push(`Node "${node.name || '(unnamed)'}" is missing required field: ${field}`);
      }
    }
    if (node.position && (!Array.isArray(node.position) || node.position.length !== 2)) {
      errors.push(`Node "${node.name}" has invalid position. Expected [x, y].`);
    }
  }
}

function checkConnections(workflow, nodeNames, errors) {
  const connections = workflow.connections || {};
  for (const [from, outputs] of Object.entries(connections)) {
    if (!nodeNames.has(from)) {
      errors.push(`Connection source does not exist: "${from}"`);
    }
    const mains = outputs.main || [];
    for (const branch of mains) {
      if (!Array.isArray(branch)) continue;
      for (const conn of branch) {
        if (!conn || !conn.node) {
          errors.push(`Connection from "${from}" has an entry without a node name.`);
          continue;
        }
        if (!nodeNames.has(conn.node)) {
          errors.push(`Connection from "${from}" references missing node: "${conn.node}"`);
        }
      }
    }
  }
}

function checkNoHardcodedSecrets(rawText, workflow, errors) {
  const patterns = [
    { label: 'classic GitHub token (ghp_)', regex: /ghp_[A-Za-z0-9]{10,}/ },
    { label: 'fine grained GitHub token (github_pat_)', regex: /github_pat_[A-Za-z0-9_]{10,}/ },
    { label: 'Telegram bot token', regex: /\b\d{6,}:[A-Za-z0-9_-]{20,}\b/ },
    { label: 'private key block', regex: /BEGIN (RSA )?PRIVATE KEY/ },
    { label: 'AWS access key', regex: /AKIA[0-9A-Z]{16}/ },
  ];
  for (const p of patterns) {
    if (p.regex.test(rawText)) {
      errors.push(`Possible hardcoded secret detected: ${p.label}`);
    }
  }

  // Look for suspicious long bearer tokens assigned literally in parameters
  const text = JSON.stringify(workflow);
  const bearerLiteral = /Bearer\s+[A-Za-z0-9._\-~+/=]{20,}/g;
  const matches = text.match(bearerLiteral) || [];
  const allowedRefs = ['$env', '{{', '}}', 'GITHUB_TOKEN', 'TELEGRAM'];
  for (const m of matches) {
    const isRef = allowedRefs.some((s) => m.includes(s) || text.includes('$env'));
    // If the match itself contains an env reference, it is fine. Otherwise flag it.
    if (!m.includes('$env') && !m.includes('{{')) {
      errors.push(`Possible hardcoded Bearer token: ${m.slice(0, 30)}...`);
    }
    void isRef;
  }

  // Flag direct assignment of known secret names to literal non empty values
  const secretKeys = ['GITHUB_TOKEN', 'WEBHOOK_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
  for (const node of workflow.nodes || []) {
    const flat = JSON.stringify(node.parameters || {});
    for (const key of secretKeys) {
      // Example bad pattern: "GITHUB_TOKEN": "abc123" as a literal value
      const literalAssign = new RegExp(`\"${key}\"\\s*:\\s*\"(?!\\s*(=|\\{\\{|\\$env))[^\\\"]{4,}\"`);
      if (literalAssign.test(flat) && !flat.includes('$env')) {
        errors.push(`Node "${node.name}" may hardcode ${key}. Use $env.${key} instead.`);
      }
    }
  }
}

function checkWebhookAuth(workflow, errors) {
  const webhooks = (workflow.nodes || []).filter((n) => n.type === 'n8n-nodes-base.webhook');
  if (webhooks.length === 0) {
    errors.push('No webhook node (n8n-nodes-base.webhook) found.');
    return;
  }
  for (const node of webhooks) {
    const params = node.parameters || {};
    const creds = node.credentials || {};
    const auth = params.authentication;
    if (!auth || auth === 'none' || auth === '') {
      errors.push(`Webhook node "${node.name}" has no authentication configured. Expected Header Auth.`);
    }
    if (!creds.headerAuth && !JSON.stringify(params).includes('X-Hub-Signature-256') && !JSON.stringify(node).includes('X-Hub-Signature-256')) {
      errors.push(
        `Webhook node "${node.name}" should reference X-Hub-Signature-256 header auth (WEBHOOK_SECRET).`
      );
    }
    if (params.path !== 'github-push') {
      errors.push(`Webhook node "${node.name}" path should be "github-push", found "${params.path}".`);
    }
    if ((params.httpMethod || 'POST') !== 'POST') {
      errors.push(`Webhook node "${node.name}" method should be POST.`);
    }
  }
}

function checkExpectedNodes(workflow, errors) {
  const expectedNames = [
    'GitHub Webhook',
    'Filter Push Event',
    'Fetch Portfolio Repos',
    'Filter and Format',
    'Fetch Languages',
    'Get Current File SHA',
    'Commit projects.json',
    'Telegram Notify',
  ];
  const names = new Set((workflow.nodes || []).map((n) => n.name));
  for (const expected of expectedNames) {
    if (!names.has(expected)) {
      errors.push(`Missing expected node: "${expected}"`);
    }
  }
}

function main() {
  const filePath = getWorkflowPath(process.argv.slice(2));
  if (!fs.existsSync(filePath)) {
    console.error(`FAIL: workflow file not found at ${filePath}`);
    process.exit(1);
  }

  const rawText = fs.readFileSync(filePath, 'utf8');
  let workflow;
  try {
    workflow = JSON.parse(rawText);
  } catch (err) {
    console.error(`FAIL: invalid JSON in ${filePath}: ${err.message}`);
    process.exit(1);
  }

  const errors = [];

  if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
    errors.push('Workflow has no nodes array or it is empty.');
  } else {
    checkRequiredFields(workflow.nodes, errors);
    const nodeNames = new Set(workflow.nodes.map((n) => n.name));
    checkConnections(workflow, nodeNames, errors);
    checkExpectedNodes(workflow, errors);
  }

  checkNoHardcodedSecrets(rawText, workflow, errors);
  checkWebhookAuth(workflow, errors);

  if (errors.length === 0) {
    console.log('PASS: workflow is valid.');
    console.log(`  Nodes: ${workflow.nodes.length}`);
    console.log(`  Connections from: ${Object.keys(workflow.connections || {}).length} nodes`);
    console.log('  Checks: required fields, connections, secrets, webhook auth.');
  } else {
    console.error('FAIL: workflow validation failed.');
    for (const e of errors) {
      console.error(`  - ${e}`);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { getWorkflowPath };
