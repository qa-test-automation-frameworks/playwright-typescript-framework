# Failure Example And Triage

![Intentional assertion failure with captured UI state](assets/screenshots/debugging-failure.png)

The example is an intentional assertion mismatch captured from a local run. It
demonstrates the evidence path without relying on a live defect.

1. Read the assertion and identify the expected business state.
2. Inspect the screenshot to confirm the rendered route and visible data.
3. Open the trace when a retry occurred and compare action timing with network events.
4. Check the JSON result and `flake-report.md` to distinguish first-pass failure,
   retry pass, and infrastructure failure.
5. Reproduce against the controlled target before changing waits or selectors.
6. File a quarantine only for bounded infrastructure instability with an owner,
   issue, reason, and expiry.

Do not increase global timeouts or retry counts as the first response.
