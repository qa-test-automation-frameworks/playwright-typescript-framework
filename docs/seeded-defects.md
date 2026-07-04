# Seeded Defect Examples

Seeded defects verify that a quality gate fails for the intended reason. They
are introduced only on a temporary branch or in a dedicated workflow and are
never merged into the default target behavior.

| Defect                     | Narrow command                                    | Failure artifact to retain                        |
| -------------------------- | ------------------------------------------------- | ------------------------------------------------- |
| Missing selector           | `npm run test:contracts -- --grep "article-card"` | Selector assertion line and Playwright trace link |
| Missing `slug`             | `npm run test:api -- --grep "article schema"`     | Zod issue path and response excerpt               |
| Login heading visual drift | `npm run test:visual -- --grep "login"`           | Baseline, actual, diff image paths                |
| Unlabeled control          | `npm run test:accessibility -- --grep "form"`     | Axe rule ID, impact, and target selector          |

These signatures are intentionally concise so they can be pasted into PR
comments, release evidence, or a future offline evidence bundle without
committing broken fixtures.
