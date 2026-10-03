// Usage:
//   npm test
//   node --test tests/
//
// Checks the n8n workflow, example output, and helper functions.
// Uses only Node.js built ins.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, 'workflows', 'autofolio.json');
const examplePath = path.join(root, 'examples', 'projects.json');

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

describe('workflow file', () => {
  it('exists and is valid JSON', () => {
    assert.ok(fs.existsSync(workflowPath), 'workflows/autofolio.json should exist');
    const wf = loadJson(workflowPath);
    assert.ok(Array.isArray(wf.nodes), 'nodes should be an array');
    assert.ok(wf.connections, 'connections should exist');
  });

  it('has 8 expected nodes with required fields', () => {
    const wf = loadJson(workflowPath);
    const expected = [
      'GitHub Webhook',
      'Filter Push Event',
      'Fetch Portfolio Repos',
      'Filter and Format',
      'Fetch Languages',
      'Get Current File SHA',
      'Commit projects.json',
      'Telegram Notify',
    ];
    const names = wf.nodes.map((n) => n.name);
    for (const e of expected) {
      assert.ok(names.includes(e), `missing node: ${e}`);
    }
    for (const node of wf.nodes) {
      for (const field of ['id', 'name', 'type', 'position', 'parameters']) {
        assert.ok(node[field] !== undefined, `${node.name} missing ${field}`);
      }
    }
  });

  it('connections reference nodes that exist', () => {
    const wf = loadJson(workflowPath);
    const names = new Set(wf.nodes.map((n) => n.name));
    for (const [from, outputs] of Object.entries(wf.connections || {})) {
      assert.ok(names.has(from), `unknown connection source: ${from}`);
      for (const branch of outputs.main || []) {
        for (const conn of branch || []) {
          assert.ok(names.has(conn.node), `unknown connection target: ${conn.node}`);
        }
      }
    }
  });

  it('has no hardcoded secrets', () => {
    const raw = fs.readFileSync(workflowPath, 'utf8');
    assert.ok(!/ghp_[A-Za-z0-9]{10,}/.test(raw), 'found hardcoded ghp_ token');
    assert.ok(!/github_pat_[A-Za-z0-9_]{10,}/.test(raw), 'found hardcoded github_pat_ token');
    assert.ok(!/BEGIN (RSA )?PRIVATE KEY/.test(raw), 'found private key');
    // Env references should be used instead
    assert.ok(raw.includes('$env.GITHUB_TOKEN'), 'should reference $env.GITHUB_TOKEN');
    assert.ok(raw.includes('$env.GITHUB_USERNAME'), 'should reference $env.GITHUB_USERNAME');
    assert.ok(raw.includes('$env.PORTFOLIO_REPO'), 'should reference $env.PORTFOLIO_REPO');
  });

  it('webhook node has authentication configured', () => {
    const wf = loadJson(workflowPath);
    const webhook = wf.nodes.find((n) => n.type === 'n8n-nodes-base.webhook');
    assert.ok(webhook, 'webhook node should exist');
    assert.equal(webhook.parameters.path, 'github-push');
    assert.equal(webhook.parameters.httpMethod, 'POST');
    assert.ok(
      webhook.parameters.authentication && webhook.parameters.authentication !== 'none',
      'webhook should have authentication'
    );
    const flat = JSON.stringify(webhook);
    assert.ok(flat.includes('X-Hub-Signature-256'), 'webhook should check X-Hub-Signature-256');
  });
});

describe('projects.json example', () => {
  it('matches schema', () => {
    const data = loadJson(examplePath);
    assert.ok(typeof data.generated === 'string', 'generated should be string');
    assert.ok(!Number.isNaN(Date.parse(data.generated)), 'generated should be ISO date');
    assert.equal(data.count, data.projects.length, 'count should match projects length');
    for (const p of data.projects) {
      for (const field of [
        'id',
        'name',
        'description',
        'url',
        'homepage',
        'language',
        'languages',
        'stars',
        'forks',
        'topics',
        'updatedAt',
        'createdAt',
        'isArchived',
        'defaultBranch',
      ]) {
        assert.ok(p[field] !== undefined, `project ${p.name} missing ${field}`);
      }
      assert.ok(Array.isArray(p.languages), 'languages should be array');
      assert.ok(Array.isArray(p.topics), 'topics should be array');
    }
  });

  it('is sorted by updatedAt descending', () => {
    const data = loadJson(examplePath);
    const times = data.projects.map((p) => new Date(p.updatedAt).getTime());
    const sorted = [...times].sort((a, b) => b - a);
    assert.deepEqual(times, sorted, 'projects should be sorted newest first');
  });
});

describe('generate-projects helpers', () => {
  const { toLanguagePercentList, formatRepo } = require('../scripts/generate-projects.js');

  it('converts byte counts to percent rounded to 1 decimal', () => {
    const out = toLanguagePercentList({ JavaScript: 784, Kotlin: 142, HTML: 74 });
    assert.deepEqual(out, [
      { name: 'JavaScript', percent: 78.4 },
      { name: 'Kotlin', percent: 14.2 },
      { name: 'HTML', percent: 7.4 },
    ]);
  });

  it('returns empty array for no languages', () => {
    assert.deepEqual(toLanguagePercentList({}), []);
    assert.deepEqual(toLanguagePercentList(null), []);
  });

  it('formats repo to portfolio schema', () => {
    const repo = {
      id: 1,
      name: 'demo',
      description: 'desc',
      html_url: 'https://github.com/you/demo',
      homepage: null,
      language: 'JavaScript',
      stargazers_count: 3,
      forks_count: 1,
      topics: ['portfolio'],
      updated_at: '2026-10-01T00:00:00.000Z',
      created_at: '2026-09-01T00:00:00.000Z',
      archived: false,
      default_branch: 'main',
    };
    const p = formatRepo(repo);
    assert.equal(p.name, 'demo');
    assert.equal(p.url, 'https://github.com/you/demo');
    assert.equal(p.stars, 3);
    assert.deepEqual(p.languages, []);
  });
});
