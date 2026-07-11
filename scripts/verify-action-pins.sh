#!/usr/bin/env bash
set -euo pipefail

workflow_dir="${1:-.github/workflows}"
if grep -RInE --include='*.yml' --include='*.yaml' 'uses: [^#]+@(v[0-9]|main|master|latest)([[:space:]]|$)' "$workflow_dir"; then
  echo "Unpinned GitHub Action reference found" >&2
  exit 1
fi
echo "All GitHub Actions are pinned to immutable commits."
