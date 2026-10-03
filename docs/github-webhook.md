# GitHub webhook guide

This guide shows how to connect GitHub to your n8n workflow so every push refreshes your portfolio.

## Step 1. Copy your n8n webhook URL

1. Open n8n and open the `autofolio` workflow.
2. Click the GitHub Webhook node.
3. Copy the Production URL. It looks like this:

```text
https://your-n8n.up.railway.app/webhook/github-push
```

Use the Production URL, not the Test URL. The Test URL only works while you are clicking Listen in n8n.

## Step 2. Open repo settings

1. Open the GitHub repo you want to trigger updates.
2. Click Settings at the top of the repo page.
3. In the left menu, click Webhooks.
4. Click Add webhook.

You need admin access to the repo to see this page.

## Step 3. Fill in the webhook form

1. Payload URL: paste your n8n Production URL.
2. Content type: select `application/json`.
3. Secret: paste the same `WEBHOOK_SECRET` you set in n8n and Railway.
4. SSL verification: leave Enable SSL verification checked.
5. Which events: select Let me select individual events.
6. Check Pushes.
7. Check Repositories.
8. Check Create if you want new branches and tags to trigger a run.
9. Make sure Active is checked.
10. Click Add webhook.

GitHub will send a `ping` event right away. n8n will ignore it because the Filter Push Event node only allows `push`, `repository`, and `create`.

## Step 4. Verify delivery in GitHub

1. Stay on the Webhooks page and click your new webhook.
2. Open the Recent Deliveries tab.
3. You should see the `ping` delivery with a green check.
4. Click it to see Request and Response. Response should be 200 from n8n.
5. Now push a small change to the repo.
6. Go back to Recent Deliveries. You should see a `push` delivery with a green check and a 200 response.

If you see a red X, click the delivery to read the error. Common cases:

- Could not resolve host: your n8n URL is wrong or Railway is asleep.
- 404: you used the Test URL or the path is not `github-push`.
- 401 or 403: the Secret does not match `WEBHOOK_SECRET` in n8n.

## Step 5. Check n8n received it

1. Open n8n and go to Executions.
2. You should see a new run for each delivery.
3. Open the run. Each node should show a green check except Telegram Notify, which may be skipped if not configured.
4. Open your portfolio repo. `projects.json` should have a fresh commit.

## Which repos need a webhook

Any single push refreshes the full list, so you only need webhooks on repos you push often. For full coverage, add the same webhook to each repo with the `portfolio` topic. There is no harm in adding it to more repos.

## Manual test with curl

If you do not want to push, send a fake event:

```bash
curl -X POST https://your-n8n.up.railway.app/webhook/github-push \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{"ref":"refs/heads/main","repository":{"full_name":"you/test"}}'
```

Check n8n Executions for the new run.
