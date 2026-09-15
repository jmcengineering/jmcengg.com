#!/usr/bin/env bash
# Fails the build if placeholder text reaches the production output.
#
# This site has shipped placeholders to real visitors twice: a contact form
# posting to REPLACE_WITH_YOUR_FORMSUBMIT_HASH that silently binned every
# enquiry, and a gallery pointed at REPLACE_WITH_YOUR_STORAGE_ACCOUNT that
# told visitors the portfolio was "being photographed". Both were live for
# months. This check exists so a third one cannot happen quietly.
#
# Known exceptions are listed below with a reason and an owner. An exception
# is a debt, not a decision — delete the line the moment it is resolved.

set -euo pipefail
DIST="${1:-dist}"

PATTERNS='REPLACE_WITH|REPLACE:|\[REPLACE|lorem ipsum|TODO_BEFORE_LAUNCH|YOUR_.*_HERE'

# ── Known exceptions ──────────────────────────────────────────────────────
# blog-post-template.html
#   A working template, deliberately kept. It carries noindex,nofollow and is
#   linked from nowhere, so no visitor or crawler reaches it.
#
# index.html  (REPLACE_WITH_YOUR_STORAGE_ACCOUNT)
#   OUTSTANDING. The works gallery has no cloud storage configured yet. The
#   loader detects the placeholder and falls back to the local photographs,
#   so nothing is broken and no failing request is made — but this line
#   should be deleted as soon as the storage account exists.
EXCEPT='blog-post-template.html|^dist/index.html$'

hits=$(grep -rIl -E "$PATTERNS" "$DIST" | grep -vE "$EXCEPT" || true)

if [ -n "$hits" ]; then
  echo "::error::Placeholder text found in build output:"
  echo "$hits" | while read -r f; do
    echo "  --- $f"
    grep -noIE ".{0,40}($PATTERNS).{0,40}" "$f" | head -5 | sed 's/^/      …/;s/$/…/'
  done
  echo ""
  echo "Either fill the placeholder in, or add it to EXCEPT in $0 with a reason."
  exit 1
fi

echo "Placeholder check passed ($(find "$DIST" -name '*.html' | wc -l | tr -d ' ') HTML files scanned)."

# Second gate: an excepted file may carry a placeholder in a config line, but
# never in text a visitor can read. Needs a real parse — script and style
# blocks span many lines, and a line-based tool silently passes them through.
for f in $(grep -rIl -E "$PATTERNS" "$DIST" | grep -E "$EXCEPT" || true); do
  case "$f" in *blog-post-template.html) continue ;; esac
  python3 - "$f" "$PATTERNS" <<'PY' || exit 1
import io, re, sys
path, patterns = sys.argv[1], sys.argv[2]
html = io.open(path, encoding='utf-8', errors='replace').read()
for tag in ('script', 'style'):
    html = re.sub(r'<%s\b.*?</%s>' % (tag, tag), ' ', html, flags=re.S | re.I)
html = re.sub(r'<!--.*?-->', ' ', html, flags=re.S)
text = re.sub(r'<[^>]*>', ' ', html)
hits = re.findall(patterns, text, flags=re.I)
if hits:
    print('::error::%s shows placeholder text to readers: %s' % (path, hits[:3]))
    sys.exit(1)
PY
done

echo "No placeholder is visible to a reader."
