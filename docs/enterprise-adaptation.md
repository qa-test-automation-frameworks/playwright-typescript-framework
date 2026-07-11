# Reference Target to Enterprise Adaptation

| Reference implementation      | Enterprise adaptation seam                                                                        | Production concern not claimed here                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Repo-owned Conduit target     | Replace the target service with an environment-owned deployment and contract-compatible seed API. | Production availability, data quality, and release safety are not proven by this repo.   |
| Authenticated fixtures        | Delegate session/bootstrap to a tenant-safe identity provider or service account broker.          | No production identity policy or secret lifecycle is claimed.                            |
| Builders and cleanup registry | Connect builders to owned test-data APIs and enforce tenant cleanup/retention.                    | No production data isolation guarantee is implied.                                       |
| API/UI hybrid projects        | Keep setup at API/service level and reserve UI for business-critical journeys.                    | Service topology, feature flags, and async dependencies require product-specific design. |
