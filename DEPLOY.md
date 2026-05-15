# Deployment checklist

## Important: local commit vs GitHub deployment
- A commit created in Codex is only local to the workspace until it is pushed to your GitHub remote.
- Railway deploys only the branch configured in Railway settings (usually `main`).

## Required steps
1. Add/commit locally.
2. Push to GitHub branch used by Railway.
3. Confirm Railway service is connected to the same repo/branch.
4. Trigger redeploy (use no-cache once if old assets persist).
5. Verify app hash/behavior after deploy.

## QR-specific step
After QR URL logic changes, regenerate and reprint bed QR labels so old labels with stale URLs are replaced.
