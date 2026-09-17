#!/usr/bin/env bash
# Fails the build if placeholder text reaches the production output.
#
# This site has shipped placeholders to real visitors twice: a contact form
# posting to REPLACE_WITH_YOUR_FORMSUBMIT_HASH that silently binned every
# enquiry, and a gallery pointed at REPLACE_WITH_YOUR_STORAGE_ACCOUNT that
# told visitors the portfolio was "being photographed". Both were live for
# months. This check exists so a third one cannot happen quietly.
#
# Exceptions are keyed to the placeholder VALUE, not to a filename. Filenames
# move: REPLACE_WITH_YOUR_STORAGE_ACCOUNT lived in index.html until the
# homepage moved into Astro, at which point it was bundled into a hashed
# /_astro/*.js and a filename-keyed exception stopped matching. A value-keyed
# one keeps working wherever the bundler puts it.

set -euo pipefail
DIST="${1:-dist}"

# Each alternative captures the WHOLE placeholder token, not just its prefix.
# A pattern of bare 'REPLACE_WITH' extracts only those 12 characters from
# REPLACE_WITH_YOUR_STORAGE_ACCOUNT, so an exception listing the full name can
# never match what was extracted - the bug this comment replaces.
PATTERNS='REPLACE_WITH[A-Za-z0-9_]*|REPLACE:|\[REPLACE[^]]*|lorem ipsum|TODO_BEFORE_LAUNCH|YOUR_[A-Za-z0-9_]*_HERE'

# ── Known exceptions ──────────────────────────────────────────────────────
# Each line is one placeholder that is knowingly still in the output, with a
# reason. An exception is a debt: delete the line when it is resolved.
#
#   REPLACE_WITH_YOUR_STORAGE_ACCOUNT
#     OUTSTANDING. The works gallery has no cloud storage configured yet. The
#     loader tests for this exact string and falls back to the local
#     photographs, so nothing is broken and no failing request is made. Delete
#     this exception the moment the storage account exists.
#   REPLACE_WITH
#     The loader's own guard - index.html tests /^REPLACE_WITH/ to decide
#     whether storage is configured. Matched exactly, so a real placeholder
#     like REPLACE_WITH_YOUR_API_KEY is still caught.
# Nothing is excepted by value any more. REPLACE_WITH_YOUR_STORAGE_ACCOUNT was
# the only entry, and it went when the works gallery moved into the repository
# and started rendering at build time — there is no storage account to name.
# An empty pattern would match every line, so this is a string nothing equals.
ALLOWED_VALUES='<<<no-exceptions>>>'

# blog-post-template.html is a working template full of [REPLACE: …] markers.
# It carries noindex,nofollow and is linked from nowhere.
ALLOWED_FILES='blog-post-template.html'

fail=0

# ── Gate 1: no placeholder anywhere except the allowed values ─────────────
while read -r f; do
  [ -z "$f" ] && continue
  case "$f" in *$ALLOWED_FILES) continue ;; esac
  # every match in this file that is NOT an allowed value
  bad=$(grep -ohIE "$PATTERNS" "$f" | grep -vxE "$ALLOWED_VALUES" || true)
  if [ -n "$bad" ]; then
    [ "$fail" -eq 0 ] && echo "::error::Placeholder text found in build output:"
    fail=1
    echo "  --- $f"
    grep -noIE ".{0,40}($PATTERNS).{0,40}" "$f" | head -3 | sed 's/^/      …/;s/$/…/'
  fi
done <<EOF
$(grep -rIl -E "$PATTERNS" "$DIST" || true)
EOF

if [ "$fail" -eq 1 ]; then
  echo ""
  echo "Either fill the placeholder in, or add its value to ALLOWED_VALUES in"
  echo "$0 with a reason for why it is allowed to ship."
  exit 1
fi

echo "Placeholder check passed ($(find "$DIST" -name '*.html' | wc -l | tr -d ' ') HTML files scanned)."

# ── Gate 2: an allowed value may sit in a config line or a script bundle,
# but must never appear in text a reader can see. Needs a real parse: script
# and style blocks span many lines, and a line-based tool passes them through.
while read -r f; do
  [ -z "$f" ] && continue
  case "$f" in *$ALLOWED_FILES) continue ;; esac
  python3 - "$f" "$PATTERNS" <<'PY' || fail=1
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
done <<EOF
$(find "$DIST" -name '*.html')
EOF

[ "$fail" -eq 1 ] && exit 1
echo "No placeholder is visible to a reader."
