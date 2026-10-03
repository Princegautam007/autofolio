# Deploy n8n on Railway

This guide shows how to host n8n for free on Railway. No server setup needed.

## Step 1. Create a Railway account

1. Go to railway.app.
2. Click Log in with GitHub.
3. Approve the GitHub access request.
4. You land on the Railway dashboard. You should see your workspaces on the left.

Screenshot description: the Railway dashboard with a New Project button in the top right and an empty project list in the center.

## Step 2. Create a new project

1. Click New Project.
2. Select Deploy from Template or search the template list.
3. Type `n8n` in the search box.
4. Select the official n8n template.
5. Click Deploy.

Screenshot description: the template search box with `n8n` typed in, showing the n8n card with a Deploy button.

## Step 3. Wait for the deploy

1. Railway will create a service and start installing n8n. This takes 2 to 5 minutes.
2. Click the service to open the Deployments tab.
3. Wait until the status shows Success with a green check.

Screenshot description: the Deployments tab showing one deployment with status Success and a log line that says n8n ready on port 5678.

## Step 4. Get the public URL

1. Open the Settings tab of the n8n service.
2. Go to the Networking section.
3. Click Generate Domain.
4. Railway gives you a URL like `https://autofolio-n8n.up.railway.app`.
5. Open that URL. You should see the n8n setup screen. Create your admin account.

Screenshot description: the Networking section with a Generate Domain button, then the generated URL shown as a clickable link.

## Step 5. Set environment variables

1. In the n8n service, open the Variables tab.
2. Click New Variable and add each of these:

```text
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_USERNAME=your_github_username
PORTFOLIO_REPO=your_portfolio_repo_name
WEBHOOK_SECRET=any_long_random_string
```

3. Optional Telegram alerts:

```text
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_CHAT_ID=your_chat_id
```

4. Also confirm these n8n defaults exist. Add them if missing:

```text
N8N_HOST=0.0.0.0
N8N_PORT=5678
WEBHOOK_URL=https://your-railway-url.up.railway.app
```

Replace the last value with the domain from Step 4.

5. Click Deploy or Redeploy so the service restarts with the new values.

Screenshot description: the Variables tab showing a list of keys on the left and hidden values on the right, with a New Variable button at the top.

## Step 6. Confirm n8n works

1. Open your public URL again.
2. Log in with the admin account you created.
3. Go to Workflows. The list can be empty for now.
4. Continue with Step 3 in [setup.md](setup.md) to import `workflows/autofolio.json`.

## Notes on the free tier

- Railway free tier gives limited hours per month. This workflow only runs for a few seconds per push, so it fits well.
- If you run out of hours, n8n will sleep. Use the standalone script in `scripts/generate-projects.js` as a backup until the next cycle.
- Do not commit your tokens to git. Keep them only in Railway Variables.
