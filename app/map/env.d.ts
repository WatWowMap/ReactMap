/**
 * Vite does not ship `ImportMetaEnv` typings unless `vite/client` is in
 * `tsconfig`'s `types`, and this project's `tsconfig.json` only lists
 * `bun-types` (shared with the Node-side `server/`). Declaring the one env
 * var this module reads here, rather than adding `vite/client` globally,
 * avoids pulling in `vite/client`'s own DOM lib assumptions for the whole
 * `app/` tree over one field.
 */
interface ImportMetaEnv {
  readonly VITE_BASEMAP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
