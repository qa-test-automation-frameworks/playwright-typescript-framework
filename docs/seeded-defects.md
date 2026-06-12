# Seeded Defect Examples

Seeded defects verify that a quality gate fails for the intended reason. They
are introduced only on a temporary branch or in a dedicated workflow and are
never merged into the default target behavior.

| Defect                              | Expected detector       | Expected evidence                    |
| ----------------------------------- | ----------------------- | ------------------------------------ |
| Remove `data-testid="article-card"` | Selector contract suite | Missing selector assertion           |
| Return an article without `slug`    | Zod runtime schema      | API response parse failure           |
| Change the login heading            | Visual suite            | Baseline, actual, and diff images    |
| Add an unlabeled form control       | Axe suite               | Accessibility violation with rule ID |

The proof is the detector's failure signature, not a permanently broken fixture.
