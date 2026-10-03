# projects.json schema reference

`projects.json` is the file your portfolio site reads. n8n writes it to your portfolio repo on every run. The standalone script writes the same shape locally.

## Top level

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| generated | string (ISO date) | yes | When the file was created, for example `2026-10-04T12:00:00.000Z`. Use it to show Last updated. |
| count | number | yes | Number of items in `projects`. Should match `projects.length`. |
| projects | array | yes | List of projects, sorted by `updatedAt` descending. Empty array if no repos have the `portfolio` topic. |

## Project object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | yes | GitHub repo ID. Stable even if you rename the repo. Use it as the list key. |
| name | string | yes | Repo name without owner, for example `kharcha`. |
| description | string or null | yes, can be null | Repo description. Can be null if the repo has no description. Show fallback text in that case. |
| url | string | yes | Link to the repo, for example `https://github.com/you/kharcha`. |
| homepage | string or null | yes, can be null | Homepage URL from repo settings. Can be null or empty string if not set. Hide the Live demo button when null. |
| language | string or null | yes, can be null | Main language reported by GitHub, for example `JavaScript`. Can be null for empty repos. |
| languages | array | yes | Language breakdown as percent. Each item is `{ name: string, percent: number }`. Empty array if unknown. Percent is rounded to 1 decimal and sums to about 100. |
| stars | number | yes | `stargazers_count`. Use for sorting or badges. |
| forks | number | yes | `forks_count`. |
| topics | array of string | yes | All repo topics, always includes `portfolio` for items in this file. |
| updatedAt | string (ISO date) | yes | `updated_at` from GitHub. The list is sorted by this field, newest first. |
| createdAt | string (ISO date) | yes | `created_at` from GitHub. |
| isArchived | boolean | yes | `archived` flag. You may want to dim or hide archived projects. |
| defaultBranch | string | yes | `default_branch`, usually `main` or `master`. |

## Example

```json
{
  "generated": "2026-10-04T12:00:00.000Z",
  "count": 1,
  "projects": [
    {
      "id": 123456789,
      "name": "kharcha",
      "description": "Smart expense tracker that reads your bank SMS automatically",
      "url": "https://github.com/Princegautam007/kharcha",
      "homepage": "https://princegautam007.github.io/kharcha",
      "language": "JavaScript",
      "languages": [
        { "name": "JavaScript", "percent": 78.4 },
        { "name": "Kotlin", "percent": 14.2 },
        { "name": "HTML", "percent": 7.4 }
      ],
      "stars": 12,
      "forks": 3,
      "topics": ["portfolio", "expense-tracker", "android", "javascript"],
      "updatedAt": "2026-10-01T08:30:00.000Z",
      "createdAt": "2026-09-01T10:00:00.000Z",
      "isArchived": false,
      "defaultBranch": "main"
    }
  ]
}
```

## What to do if a field is null

- `description` null: show `"No description yet."` or hide the paragraph.
- `homepage` null or `""`: hide the Live demo link. Only show the GitHub link.
- `language` null: show `"Mixed"` or hide the badge.
- `languages` empty: hide the language bar. Do not divide by zero.
- `topics` empty (should not happen here): treat as no tags.

Defensive render example:

```js
const desc = p.description || "No description yet.";
const demo = p.homepage ? `<a href="${p.homepage}">Live demo</a>` : "";
const lang = p.language || "Mixed";
```

## How to add custom fields

1. Edit the Filter and Format Code node in n8n to add the field, for example `openIssues: repo.open_issues_count`.
2. Edit `scripts/generate-projects.js` in the same way so local runs match.
3. Update this doc and `examples/projects.json`.
4. Run `node scripts/validate-workflow.js` to confirm the workflow still passes.
5. Trigger a run and confirm your site handles missing values for old entries.

Keep custom fields simple types: string, number, boolean, or arrays of those. Avoid nested objects so any frontend can render them.
