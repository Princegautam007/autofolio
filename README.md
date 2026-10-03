# Autofolio

Your portfolio updates itself every time you push to GitHub. No manual edits. No forgotten projects. No stale demo links.

## The problem

You build great projects on GitHub, but your portfolio site still shows last year's work. Updating it means editing HTML, copying descriptions, counting stars, and redeploying by hand. Most developers stop updating it, and the portfolio slowly goes out of date.

Autofolio fixes this. Tag any repo with the `portfolio` topic on GitHub, and your site shows it within about 60 seconds.

## How it works

1. You push code, edit a README, or change a repo description on GitHub.
2. GitHub sends a webhook to your n8n workflow.
3. n8n fetches your repos with the `portfolio` topic, formats them into `projects.json`, and commits the file back to your portfolio repo.
4. Vercel sees the new commit, redeploys, and your site renders the fresh list.

You control what appears by adding or removing the `portfolio` topic. No code changes needed.

## Before and after

Before: you finish a project, then you have to open your portfolio code, copy the title and description, add links, push, and redeploy. You do this for every project, and you often skip it.

After: you add the `portfolio` topic to the repo on GitHub. That is it. The project shows up on your site in about 60 seconds with the correct description, stars, languages, and links.

## Quick start

Read the full guide: [docs/setup.md](docs/setup.md)

Short version:

1. Tag repos with the `portfolio` topic.
2. Deploy n8n (see [docs/railway-setup.md](docs/railway-setup.md)).
3. Import `workflows/autofolio.json` into n8n and set your credentials.
4. Add the GitHub webhook (see [docs/github-webhook.md](docs/github-webhook.md)).
5. Push to test.

No n8n? Use the standalone script for testing:

```bash
GITHUB_TOKEN=xxx GITHUB_USERNAME=Princegautam007 PORTFOLIO_REPO=portfolio node scripts/generate-projects.js
```

See [docs/projects-json-schema.md](docs/projects-json-schema.md) for what the output looks like.

## Tools used and why they are free

- **GitHub API and webhooks**: free for public repos. This is the source of truth for your work.
- **n8n**: free self hosted workflow runner. It listens for webhooks and calls APIs without you writing a server.
- **Railway**: free tier hosting for n8n. Enough for a low traffic webhook like this.
- **Vercel**: free hosting for portfolio sites with automatic redeploys on every commit.
- **Node.js scripts in this repo**: free and dependency free. They let you test the same logic without n8n.

There are no paid APIs and no npm dependencies. Everything runs on free tiers and Node.js built ins.

## Add it to any portfolio site

Your site only needs to read one file: `projects.json` in your portfolio repo. Fetch it at build time or load it as a static file, loop over the `projects` array, and render a card for each project with name, description, stars, language, and links. See [examples/projects.json](examples/projects.json) for the exact shape and [docs/projects-json-schema.md](docs/projects-json-schema.md) for field details.

Example:

```js
const res = await fetch("/projects.json");
const data = await res.json();
data.projects.forEach((p) => {
  console.log(p.name, p.description, p.url, p.stars);
});
```

## What is inside

```text
autofolio/
  workflows/autofolio.json          n8n workflow you import
  scripts/generate-projects.js      standalone script, same logic without n8n
  scripts/validate-workflow.js      checks the workflow JSON is valid
  docs/setup.md                     full setup guide
  docs/railway-setup.md             deploy n8n on Railway
  docs/github-webhook.md            configure the GitHub webhook
  docs/projects-json-schema.md      reference for projects.json
  examples/projects.json            example output
  examples/sample-workflow-run.json  example webhook payload
```

## Validate

```bash
node scripts/validate-workflow.js
npm test
```

## License

MIT. Use it, fork it, improve it.
