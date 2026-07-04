# Capability Status

| Capability           | Status   | Evidence                                   |
| -------------------- | -------- | ------------------------------------------ |
| Controlled target    | Enforced | `npm run with:target -- npm run check:env` |
| API contract checks  | Enforced | `npm run test:api`                         |
| Browser workflows    | Enforced | `npm run test:e2e`                         |
| Accessibility checks | Enforced | `npm run test:accessibility`               |
| Visual baselines     | Enforced | `npm run test:visual`                      |
| Flake budget         | Enforced | `npm run flake:check`                      |
