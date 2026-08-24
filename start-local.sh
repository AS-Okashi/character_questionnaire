#!/usr/bin/env bash
set -euo pipefail

site_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
port="${1:-8000}"
exec uv run --directory "$site_dir" python -m http.server "$port" --directory "$site_dir"
