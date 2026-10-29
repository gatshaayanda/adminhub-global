# Deployment retry checkpoint

- A GitHub commit being pushed to `main` confirms source delivery only; it does not confirm that Vercel built or deployed that revision.
- After a fresh chore commit, inspect the commit's Vercel status and verify that any deployment references that exact SHA.
- If Vercel rejects deployment because of a daily API/build quota, stop retrying deployments until the platform's stated retry window clears. A no-op commit does not reset that quota.
- Do not ask the product owner to QA the production URL while it still serves an older deployment. Report the pushed commit, deployment status, and live-route QA separately.
- Never change application code, billing, project settings, or Firebase rules solely to work around a deployment quota.
