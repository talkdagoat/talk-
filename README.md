# Cloud Linux Workspace

Browser-based Ubuntu desktop for iPad, tablets and computers. The browser is the screen and controls; Linux runs remotely in an isolated Vercel Sandbox.

## Architecture
- Vite frontend served from this repository.
- Existing Linux runtime project remains the backend while this Git-connected site is brought online.
- Per-user access keys (no password) and isolated Sandbox sessions.
- Vercel Drive is the current working-file store. The previous runtime provisions 1 GiB per access key; it is not the planned 10 GB disk.
- TeraBox OAuth is not enabled yet. It requires approved developer credentials; TeraBox is planned for file sync/backup, not as the live Linux root disk.

## Deploy
Node 24, npm install, npm run build, output directory dist.

## Server-only environment
LINUX_MASTER_SECRET, LINUX_BASE_SNAPSHOT_ID, and optional LINUX_INVITE_KEY. Never expose these values to the browser.

A successful web build does not prove the remote Linux runtime works. A valid base snapshot and Sandbox/Drive access are required. Interactive sessions have time and resource limits. Do not promise unlimited free compute or 10 GB per user until persistent compute and storage are provisioned.
