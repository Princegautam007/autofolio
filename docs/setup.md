# Setup guide

This guide takes you from zero to a self updating portfolio. It takes about 30 minutes.

## What you need

- A GitHub account
- A portfolio site repo on GitHub (any static site, deployed on Vercel)
- A Railway account for free n8n hosting
- About 30 minutes

## Step 1. Tag repos with the portfolio topic

1. Open any repo you want on your portfolio.
2. On the repo main page, click the gear icon next to About on the right side.
3. In the Topics field, type `portfolio` and press Enter.
4. Click Save changes.
5. Repeat for each repo you want to show.

Only repos with the `portfolio` topic will appear. To hide a repo, remove the topic. You never need to edit code to add or remove a project.

## Step 2. Deploy n8n on Railway

Follow [railway-setup.md](railway-setup.md) to deploy n8n. At the end you will have:

- A public n8n URL like `https://autofolio-n8n.up.railway.app`
- Environment variables set: `GITHUB_TOKEN`, `GITHUB_USERNAME`, `PORTFOLIO_REPO`, `WEBHOOK_SECRET`, and optionally `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`

Keep that URL open. You need it in the next step.

## Step 3. Import autofolio.json into n8n

1. Open your n8n URL and log in.
2. Click Import from File in the Workflows list.
3. Select `workflows/autofolio.json` from this repo.
4. You should see 8 nodes: GitHub Webhook, Filter Push Event, Fetch Portfolio Repos, Filter and Format, Fetch Languages, Get Current File SHA, Commit projects.json, Telegram Notify.
5. Click each HTTP node and confirm it reads values from `$env.GITHUB_TOKEN`, `$env.GITHUB_USERNAME`, and `$env.PORTFOLIO_REPO`. Do not paste tokens directly into the nodes.
6. Open the GitHub Webhook node. Set Header Auth with your `WEBHOOK_SECRET`. The header name must be `X-Hub-Signature-256`.
7. Click Activate so the workflow listens for webhooks.
8. Copy the Production URL from the GitHub Webhook node. It looks like `https://your-n8n.up.railway.app/webhook/github-push`.

## Step 4. Set credentials in n8n

You can set these as n8n environment variables on Railway, or as n8n credentials. Environment variables are simpler.

Required:

- `GITHUB_USERNAME`: your GitHub username, for example `Princegautam007`
- `GITHUB_TOKEN`: a classic personal access token with `public_repo` scope. Create one at GitHub Settings, then Developer settings, then Personal access tokens.
- `PORTFOLIO_REPO`: the name of your portfolio site repo, for example `portfolio`
- `WEBHOOK_SECRET`: any long random string. Use the same value in the GitHub webhook settings.

Optional:

- `TELEGRAM_BOT_TOKEN`: token from BotFather if you want Telegram alerts
- `TELEGRAM_CHAT_ID`: your chat ID for the alerts

If Telegram values are missing, the last node fails silently and the rest still works.

## Step 5. Add projects.json reading code to your portfolio site

Your site needs to read `projects.json` from the portfolio repo root and render it.

1. After the first workflow run, confirm `projects.json` exists in your portfolio repo.
2. In your site code, fetch it at build time or import it as a static file.
3. Loop over `projects` and render a card per project.

Plain JavaScript example:

```js
const res = await fetch("/projects.json");
const data = await res.json();
data.projects.forEach((p) => {
  console.log(p.name, p.description, p.url, p.stars);
});
```

React example:

```js
function Projects({ projects }) {
  return (
    <ul>
      {projects.map((p) => (
        <li key={p.id}>
          <a href={p.url}>{p.name}</a>
          <p>{p.description}</p>
          <span>{p.language} stars: {p.stars}</span>
        </li>
      ))}
    </ul>
  );
}
```

See [projects-json-schema.md](projects-json-schema.md) for every field.

## Step 6. Configure the GitHub webhook

Follow [github-webhook.md](github-webhook.md). Short version:

1. Go to any repo Settings, then Webhooks, then Add webhook.
2. Paste your n8n Production URL.
3. Set Content type to `application/json`.
4. Paste your `WEBHOOK_SECRET` as the Secret.
5. Select Let me select individual events, then check Pushes and Repositories.
6. Click Add webhook.

Repeat for each repo you want to trigger updates, or add it once on an organization. Any push will refresh the full list, so one webhook is enough to keep everything fresh.

## Step 7. Push any repo to test it

1. Make a small change in any repo, for example edit the README.
2. Push to GitHub.
3. Open n8n Executions. You should see a new run within seconds.
4. Check your portfolio repo. `projects.json` should have a new commit with message `chore: auto-update projects.json`.
5. Vercel will redeploy. Open your site and confirm the list changed.

## Test the webhook manually without pushing

Use this curl command to send a fake push event. Replace `N8N_URL` with your Production URL.

```bash
curl -X POST N8N_URL/webhook/github-push \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-Hub-Signature-256: sha256=test" \
  -d '{"ref":"refs/heads/main","repository":{"full_name":"test/test"}}'
```

If n8n shows a new execution, your URL and network work. GitHub delivery with a real secret is tested in [github-webhook.md](github-webhook.md).

## Test without n8n

Run the standalone script. It does the same fetch and format and writes `projects.json` locally.

```bash
GITHUB_TOKEN=xxx GITHUB_USERNAME=Princegautam007 PORTFOLIO_REPO=portfolio node scripts/generate-projects.js
```

## If it does not work

- No execution in n8n: check the webhook URL is the Production URL, not the Test URL, and the workflow is Active.
- 401 or 404 from GitHub API: check `GITHUB_TOKEN` has `public_repo` scope and `GITHUB_USERNAME` is correct.
- `projects.json` not updated: check `PORTFOLIO_REPO` name and that the token can write to that repo.
- Telegram errors: leave those vars empty to skip, or check token and chat ID.
