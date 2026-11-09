# Local development without AWS

This setup runs only on your computer. It does not create an AWS resource, public server, chargeable database, or external account. PostgreSQL listens only on `127.0.0.1`, and the API listens only on `127.0.0.1`.

## One-time setup

1. Install the Node.js version shown in `.node-version`.
2. Enable the repository's pnpm version with `corepack enable` and `corepack prepare pnpm@12.18.0 --activate`, or install that pnpm version by your normal package-manager method.
3. Install and start Docker Desktop or Docker Engine. `docker info` must succeed before `pnpm db:up` can work. On Linux, starting the Docker service may require your system administrator; do not change company-machine permissions without approval.
4. From the repository root, create local configuration:

   ```bash
   cp .env.example .env
   ```

5. Open `.env` and replace `replace-with-a-random-local-password` with a random password used only on this machine. Never commit `.env`.

## Start the system

Run these commands from the repository root:

```bash
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm db:check
pnpm dev
```

Then open `http://127.0.0.1:5173`. The web process and API process remain visible in the terminal. Stop them with `Ctrl+C`. Stop PostgreSQL with `pnpm db:down`; its named volume remains so the next start keeps local data.

The seed contains only `Local User`, `Local Admin`, and `Local Super Admin`. It stores no passwords. The local identity adapter is enabled only by `LOCAL_AUTH_ENABLED=true` and configuration rejects it when `NODE_ENV=production`.

## Check the API directly

With `pnpm dev` running, these commands verify the identity boundary:

```bash
curl http://127.0.0.1:3000/api/v1/development/identities
curl -H 'X-WorkPilot-Local-User: local-user' http://127.0.0.1:3000/api/v1/me
```

The first route is absent when local identity is disabled. A `/me` request without the header returns `401`.

## Common problems

- `Cannot connect to the Docker daemon`: start Docker Desktop/Engine, wait until it reports ready, then rerun `docker info` and `pnpm db:up`.
- `port is already allocated`: another PostgreSQL may be using `5432`; set another `POSTGRES_PORT` in `.env`, such as `5433`, then restart the compose service.
- `password authentication failed` after changing `.env`: the existing named volume was initialized with the earlier password. Prefer restoring the earlier local password. Removing the volume deletes the local database and is intentionally not included as a routine command.
- API starts but the browser cannot call it: keep `WEB_ORIGIN` equal to the exact Vite URL, normally `http://127.0.0.1:5173`.
