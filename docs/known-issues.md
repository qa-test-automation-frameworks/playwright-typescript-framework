# Known Issues

| Area | Status | Workaround |
| --- | --- | --- |
| Visual baselines | Windows Chromium snapshots are the committed baseline | Regenerate snapshots only from the pinned workflow environment |
| External target runs | Public RealWorld-compatible targets vary by deployment | Use the repo-owned target for deterministic CI |
| Artifact retention | CI traces and reports expire | Use committed screenshots and the offline evidence bundle for stable review |
