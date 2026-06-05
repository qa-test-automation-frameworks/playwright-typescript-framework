## Summary

Please describe the goal of this change, detailing the features verified or changes made to POM/fixtures.

## Testing Strategy

- [ ] New automated tests added?
- [ ] API-only or hybrid browser?
- [ ] Visual regression snapshot verified?

## Quality Checklist

- [ ] `npm run lint` finishes successfully (no style violations).
- [ ] `npm run type-check` finishes successfully (no type compilation errors).
- [ ] `npm run test` verified locally and all tests green.
- [ ] Proper tagging (`@smoke`, `@api`, `@ui`, `@visual`, `@critical`) added.
- [ ] No direct imports from `@playwright/test` inside tests.
- [ ] No hardcoded configuration strings or secrets.
