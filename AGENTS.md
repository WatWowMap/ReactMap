# Repository Guidelines

## Project Structure & Module Organization

- React client code lives in `src/`, with shared UI in `src/components`, feature bundles in `src/features`, and hooks/services under `src/hooks`, `src/services`, and `src/utils`.
- The Node.js API, GraphQL schema, and auth logic are in `server/src`; configs and migrations sit under `server/src/configs` and `server/src/db`.
- Workspace packages in `packages/` expose shared config (`@rm/config`), localization, logging, masterfile data, and build plugins; treat them as the source of truth for cross-app utilities.
- Static assets are sourced from `public/`, while built bundles land in `dist/`; avoid committing build artefacts or anything listed in `.gitignore`.

## Build, Test, and Development Commands

- `yarn install` – install workspace dependencies; rerun after pulling lockfile changes.
- `yarn dev` – start the full dev stack (Nodemon backend + Vite) using local config.
- `yarn watch` – Vite-only hot reload for rapid UI work when the API is proxied elsewhere.
- `yarn build` – create a production bundle in `dist/`; ensure it succeeds before release PRs.
- `yarn lint` / `yarn lint:fix` – run ESLint with the Airbnb ruleset; lint must pass pre-commit.
- `yarn prettier` / `yarn prettier:fix` – enforce formatting for JS/JSX, CSS, HTML, and YAML.
- `yarn config:env` and `yarn locales:generate` – regenerate env files and derived locales after editing base config or strings.

## Coding Style & Naming Conventions

- Prettier governs formatting (2-space indent, single quotes in JS, semicolons off); never hand-format conflicting styles.
- Prefer functional React components, PascalCase for components, camelCase for helpers, and `use` prefixes for hooks.

## Testing Guidelines

- No dedicated Jest suite today; rely on `yarn lint`, type checks from editor tooling, and manual verification in a local dev session.
- When adding backend features, exercise relevant GraphQL/REST paths via the dev server and document sanity checks in the PR description.

## Commit & Pull Request Guidelines

- Use Conventional Commits (`type(scope): summary`), matching existing history (e.g. `feat(map): add weather overlays`).
- Each PR should describe scope, link related issues, list testing steps, and include screenshots or GIFs for UI changes.
- Re-run `yarn lint`, `yarn build`, and integration steps touched by the change before requesting review.

## Localization Notes

- Update English copy only in `packages/locales/lib/human/en.json`; run `yarn locales:generate` to refresh derived languages.
- Never edit generated locale files directly—the automation pipeline syncs translations downstream.
