# Deployment

The site is a static build served by nginx in one Docker container on Easypanel, at
<https://npp.happyvoxel.com>. Woodpecker CI (`https://ci.happyvoxel.com`, itself an Easypanel
service) builds the image and Easypanel runs it.

```
push to master
  └─ .woodpecker/test.yaml         pnpm lint, pnpm typecheck, pnpm test
  └─ .woodpecker/production.yaml   docker build → ghcr.io/happyvoxel/neuroparticles-plus:latest + :sha-<commit>
                                   Easypanel API deployService → Easypanel pulls :latest
```

Files involved: `Dockerfile`, `.dockerignore`, `nginx.conf`, `.woodpecker/test.yaml`,
`.woodpecker/production.yaml`. The app has no runtime env and no secrets.

## Where each setting lives

| Setting                   | Where                         | Kind      |
| ------------------------- | ----------------------------- | --------- |
| `ghcr_username`           | Woodpecker org secret         | CI        |
| `ghcr_token`              | Woodpecker org secret         | CI        |
| `easypanel_token`         | Woodpecker org secret         | CI        |
| Easypanel project/service | `.woodpecker/production.yaml` | CI        |
| GHCR pull token           | Easypanel service image       | pull auth |

- `ghcr_token` is a **classic** personal access token with `write:packages`. GHCR does not accept
  fine-grained tokens. `ghcr_username` is the GitHub user that owns it.
- `easypanel_token` is the Easypanel API token shared by every HappyVoxel repo. It can change any
  service, so its allowed events are `push` and `manual` only.
- Org secrets reach only repos in the HappyVoxel org, and the Woodpecker server lets in only that org
  (`WOODPECKER_ORGS=HappyVoxel`), so the repo lives at `HappyVoxel/neuroparticles-plus`.

## One-time setup

The Easypanel service needs an image to pull, so the first run publishes the image and its deploy
step fails because the service does not exist yet.

1. **Move the repo.** Transfer it on GitHub to the HappyVoxel org, then
   `git remote set-url origin git@github.com:HappyVoxel/neuroparticles-plus.git`.
2. **Activate the repo.** Log in to `https://ci.happyvoxel.com` and add
   `HappyVoxel/neuroparticles-plus`. Settings → General: timeout 30 minutes, and untick `push`
   under "Cancel previous pipelines".
3. **Publish the first image.** Run a manual pipeline on `master`. The private package
   `ghcr.io/happyvoxel/neuroparticles-plus` now has `:latest`.
4. **Create the Easypanel service.** In project `ideas`, an **App** service named `neuroparticles`.
   Source → **Docker Image**:
   - Image: `ghcr.io/happyvoxel/neuroparticles-plus:latest`
   - Username: the GitHub user that owns the pull token
   - Password: a **classic** token with only `read:packages` (reuse the one other HappyVoxel services
     pull with)
5. **Add the domain.** Domains → `npp.happyvoxel.com`, HTTPS on, **proxy port 8080**.
6. **Deploy by hand once.** Press Deploy and open the domain.

From then on, every push to `master` that passes the checks is live a minute or two later.

## Operations

- **Roll back:** in Easypanel, set the image to
  `ghcr.io/happyvoxel/neuroparticles-plus:sha-<old commit>` and deploy. Switch back to `:latest`
  afterwards, or the next pipeline deploy keeps the pinned tag.
- **Caching:** nginx sends `no-cache` for `index.html` and a one-year `immutable` for `assets/`,
  whose file names change with their content. A deploy shows on the next page load.

## Build and run locally

```bash
docker build --platform linux/amd64 -t neuroparticles:local .
docker run --rm -p 8080:8080 neuroparticles:local
```

Then open <http://localhost:8080>.
