# Allure publisher repair — 2026-10-04

## Established cause

[CI run 37002890998](https://github.com/qa-test-automation-frameworks/playwright-typescript-framework/actions/runs/37002890998),
job `110825060931`, failed after its test jobs succeeded. The publishing log
reported **`xargs is not available`** inside the pinned Docker report action,
followed by missing generated report/history directories. This is a report
renderer failure; it is not evidence that the tests failed.

## Change

Report generation now uses project-local `allure-commandline` **2.46.1**, pinned
in the npm lockfile, with declared JDK 21. The [official Allure 2 installation
instructions](https://allurereport.org/docs/v2/install-for-nodejs/) describe this
CLI and its Java prerequisite. Allure 2 preserves the existing report format;
Allure 3 adoption is a separate compatibility decision.

CI downloads artifact groups separately before merging. The collector requires
API, both E2E shards, both visual shards, accessibility, selector contracts and
cross-browser smoke. Scheduled runs additionally require all three full browser
regression groups. It rejects missing/empty groups, invalid results, repeated
UUIDs, conflicting attachment filenames and unexpected non-file entries.
Preflight happens before writing a new candidate directory.

Every CI branch can render a candidate artifact; only successful default-branch
runs deploy Pages. Scheduled browser failures cannot be hidden by a successful
regular smoke profile. A generated `source.json` records the actual source SHA,
run URL and attempt. Deployment requires successful report generation, so a
renderer failure leaves the last deployed report intact. Native HTML remains in
the individual test artifacts.

Manual deployment now retrieves a rendered artifact from a successful trusted
push/schedule `CI` run on main/master, verifies its SHA/run/attempt, and republishes
it. It rejects pull-request results and does not rerun the suites or imply a new
test execution. This also removes the manual path's dependency on the same broken
Docker action and its Linux invocation of Windows visual baselines.

## Validation and limits

- Seven focused publication regressions cover complete pass/fail input,
  missing/empty groups, UUID duplication, attachment conflict, existing candidate
  preservation and scheduled matrix completeness. They run alongside fourteen
  diagnostic tests: **21 passing unit cases**.
- Lint/type/format checks passed on Node 24.19.0/npm 10.9.4.
- The owned-target API results rendered successfully with JDK 21.0.12.1 and the
  pinned CLI.
- Real artifacts from the diagnosed October 2 run were downloaded and collected:
  **8 required groups, 93 raw Allure result records**. The generated report's
  native summary displays **79 passed, 0 failed/broken/skipped**. Raw records
  include repeated setup/teardown execution across jobs; displayed report cases
  and raw execution records are different denominators.

This is local reproduction using historical real CI inputs, not a newly deployed
public result. A current PR CI run must validate collection/rendering in GitHub,
and a default-branch deployment must prove the public path before F06 is fully
verified. Long-term immutable hosting, atomic latest indexes and explicit failed
latest-attempt display remain E01–E04 requirements. Short-lived artifacts and a
preserved last good Pages report do not satisfy those requirements by themselves.
