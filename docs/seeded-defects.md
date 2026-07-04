# Seeded Defect Examples

Seeded defects verify that a quality gate fails for the intended reason. They
are introduced only on a temporary branch or in a dedicated workflow and are
never merged into the default target behavior.

| Defect                              | Expected detector       | Captured failure signature |
| ----------------------------------- | ----------------------- | -------------------------- |
| Remove `data-testid="article-card"` | Selector contract suite | `expect(locator).toHaveCount()` fails for required selector `article-card` |
| Return an article without `slug`    | Zod runtime schema      | `ZodError: Required at path ["articles",0,"slug"]` during API response parsing |
| Change the login heading            | Visual suite            | Visual project emits baseline, actual, and diff attachments for the login heading snapshot |
| Add an unlabeled form control       | Axe suite               | Axe reports `label` violation for a form element without an accessible name |

The proof is the detector's failure signature, not a permanently broken fixture.

## Proof Capture Procedure

The defects above are injected on a throwaway branch and never committed to
`main`. The reviewer-facing proof is the detector-specific failure signature:

1. Create a temporary branch from `main`.
2. Apply one mutation only.
3. Run the narrow detector command from the table below.
4. Capture the first failing assertion, rule ID, or parser error.
5. Reset the mutation before moving to the next defect.

| Defect | Narrow command | Failure artifact to retain |
| --- | --- | --- |
| Missing selector | `npm run test:contracts -- --grep "article-card"` | Selector assertion line and Playwright trace link |
| Missing `slug` | `npm run test:api -- --grep "article schema"` | Zod issue path and response excerpt |
| Login heading visual drift | `npm run test:visual -- --grep "login"` | Baseline, actual, diff image paths |
| Unlabeled control | `npm run test:accessibility -- --grep "form"` | Axe rule ID, impact, and target selector |

These signatures are intentionally concise so they can be pasted into PR
comments, release evidence, or a future offline evidence bundle without
committing broken fixtures.
