/** Bind native results to the tested checkout, run attempt and evidence scope. */
export function nativeEvidenceMetadata(): Record<string, string | null> {
  return {
    evidenceSourceSha: process.env.GITHUB_SHA ?? null,
    evidenceRunId: process.env.GITHUB_RUN_ID ?? null,
    evidenceRunAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    evidenceScope: process.env.EVIDENCE_SCOPE ?? null,
  };
}
