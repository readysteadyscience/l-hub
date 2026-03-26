#!/bin/sh
# L-Hub ACA v2 — Git Pre-Commit Hook
# Automatically reviews staged code changes before commit.
# Install: L-Hub extension auto-installs this hook on activation.
# Skip:    git commit --no-verify

# Locate the ACA runner
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RUNNER=""

# Try to find the runner in L-Hub extension paths
for candidate in \
    "$HOME/.vscode/extensions"/readysteadyscience.l-hub-*/dist/aca-runner.js \
    "$HOME/.antigravity/extensions"/readysteadyscience.l-hub-*/dist/aca-runner.js \
    "$HOME/Library/Application Support/Antigravity/User/extensions"/readysteadyscience.l-hub-*/dist/aca-runner.js; do
    if [ -f "$candidate" ]; then
        RUNNER="$candidate"
        break
    fi
done

if [ -z "$RUNNER" ]; then
    # Silently skip if L-Hub is not installed
    exit 0
fi

# Run the ACA reviewer
node "$RUNNER"
exit $?
