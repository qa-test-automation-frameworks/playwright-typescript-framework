# ADR-002: Choosing Conduit RealWorld as the Target Application

## Status

Superseded by [ADR-004: Repo-owned controlled target as default](ADR-004-repo-owned-controlled-target.md)

## Context

A portfolio test automation project benefits from a realistic web application with browser flows and matching API contracts. We evaluated standard testing playgrounds (for example Sauce Demo, OrangeHRM, and demo.opencart.com) and selected a target with authentication, CRUD behavior, comments, tags, and social relationships.

## Decision

We chose the public **Conduit RealWorld Application** as the default target:

- UI: `https://demo.realworld.show`
- API: `https://api.realworld.show/api`

## Rationale

Standard demo sites like Sauce Demo (an e-commerce page) present only simple DOM clicks and inputs with no backend social interaction graph or deep API layer.
Conduit, a clone of Medium.com, is an industry-standard, fully functional social-blogging application that includes:

- **Authentication:** Token-based JWT flow, which exercises state saving and injection in test runs.
- **Rich CRUD & Relationships:** Article publishing, tag filtering, nested comments, profile customization, and user following/unfollowing.
- **REST API access:** Accessible API endpoints (`https://api.realworld.show/api`) that match the UI behavior closely enough for external integration checks.

## Consequences

### Positive (Benefits)

- **True Hybrid Validation:** We can test the exact same functionality via direct API calls (e.g. backend verification) and web interactions (e.g. browser UI), validating full-stack consistency.
- **Real-World Complexity:** Exercises deep Page Object models, dynamic state configurations (following social networks), and realistic workflows.
- **Differentiated Showcase:** Avoids the generic and simplistic nature of Sauce Demo while keeping the target application publicly accessible.

### Negative (Drawbacks)

- **Complex Setups:** Requires managing multiple users (e.g. follows, comment authors) and state cleanups to prevent persistent data pollution in the database.
- **External Dependency:** Relies on the public availability and behavior of the Conduit frontend and backend API. CI results can be affected by public service availability, rate limits, data persistence, and contract drift. For deterministic CI, point `BASE_URL` and `API_URL` at a controlled RealWorld deployment.
