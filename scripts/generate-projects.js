// Usage:
//   GITHUB_TOKEN=xxx GITHUB_USERNAME=Princegautam007 PORTFOLIO_REPO=portfolio node scripts/generate-projects.js
//   GITHUB_TOKEN=xxx GITHUB_USERNAME=Princegautam007 node scripts/generate-projects.js --out ./projects.json
//
// Does what n8n nodes 3 to 5 do, without n8n:
//   1. Fetches public repos for GITHUB_USERNAME from the GitHub API
//   2. Keeps repos tagged with the "portfolio" topic
//   3. Fetches languages per repo and converts bytes to percent
//   4. Writes projects.json to the current directory
//
// Uses only Node.js built ins (node:https, node:fs). No npm dependencies.
// Requires Node >= 18.

const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
  const outIndex = argv.indexOf('--out');
  let out = 'projects.json';
  if (outIndex !== -1 && argv[outIndex + 1]) {
    out = argv[outIndex + 1];
  }
  return { out };
}

function getEnv() {
  const token = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_USERNAME;
  if (!token) {
    console.error('Missing GITHUB_TOKEN. Example: GITHUB_TOKEN=xxx GITHUB_USERNAME=you node scripts/generate-projects.js');
    process.exit(1);
  }
  if (!username) {
    console.error('Missing GITHUB_USERNAME. Example: GITHUB_TOKEN=xxx GITHUB_USERNAME=you node scripts/generate-projects.js');
    process.exit(1);
  }
  return { token, username };
}

function httpsGetJson(url, token) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'autofolio-script',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(raw || '{}'));
            } catch (err) {
              reject(new Error(`Failed to parse JSON from ${url}: ${err.message}`));
            }
          } else {
            reject(new Error(`GitHub API ${res.statusCode} for ${url}: ${raw.slice(0, 500)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error(`Request timed out for ${url}`));
    });
  });
}

function toLanguagePercentList(languageBytes) {
  const entries = Object.entries(languageBytes || {});
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (total === 0) {
    return [];
  }
  return entries
    .map(([name, bytes]) => ({
      name,
      percent: Math.round((bytes / total) * 1000) / 10,
    }))
    .sort((a, b) => b.percent - a.percent);
}

function formatRepo(repo) {
  return {
    id: repo.id,
    name: repo.name,
    description: repo.description,
    url: repo.html_url,
    homepage: repo.homepage,
    language: repo.language,
    languages: [],
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    topics: repo.topics || [],
    updatedAt: repo.updated_at,
    createdAt: repo.created_at,
    isArchived: repo.archived,
    defaultBranch: repo.default_branch,
  };
}

async function main() {
  const { out } = parseArgs(process.argv.slice(2));
  const { token, username } = getEnv();

  const reposUrl =
    `https://api.github.com/users/${encodeURIComponent(username)}/repos` +
    `?type=public&per_page=100&sort=updated`;
  console.log(`Fetching repos for ${username}...`);
  const repos = await httpsGetJson(reposUrl, token);

  if (!Array.isArray(repos)) {
    throw new Error('Unexpected GitHub response: expected an array of repos.');
  }

  const matching = repos.filter(
    (repo) => Array.isArray(repo.topics) && repo.topics.includes('portfolio')
  );
  console.log(`Found ${matching.length} repos with portfolio topic out of ${repos.length} public repos.`);

  const projects = matching.map(formatRepo);
  projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  for (const project of projects) {
    const langUrl = `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(
      project.name
    )}/languages`;
    try {
      const bytes = await httpsGetJson(langUrl, token);
      project.languages = toLanguagePercentList(bytes);
    } catch (err) {
      console.warn(`Warning: could not fetch languages for ${project.name}: ${err.message}`);
      project.languages = [];
    }
  }

  const output = {
    generated: new Date().toISOString(),
    count: projects.length,
    projects,
  };

  const outPath = path.resolve(process.cwd(), out);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${output.count} projects to ${outPath}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { toLanguagePercentList, formatRepo };
