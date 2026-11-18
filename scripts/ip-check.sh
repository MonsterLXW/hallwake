#!/bin/sh
# HALLWAKE IP safety gate — plan/architecture.md section 12.
#
# Scans shipped material (app/, scripts/, .github/, README*) for banned
# third-party game-IP terms so no reference game's IP leaks into anything we
# ship. Exit codes: 0 = clean, 1 = violation(s) printed, 2 = scan error.
#
# --selftest plants a file containing a banned term in a mktemp dir, asserts
# the scan catches it (exit 1), then asserts the full repo scan is clean
# (exit 0). Both must pass for the script to exit 0.
#
# Every pattern's final character is written as a bracket class (roblo[x]) so
# this script never matches its own patterns while scripts/ is scanned.
# POSIX sh only ([ ] not [[ ]]); runs under Git Bash on Windows and bash on CI.

set -u

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 2
cd -- "$script_dir/.." || exit 2

EXCLUDES='--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.venv --exclude-dir=.git --exclude-dir=data --exclude-dir=plan --exclude-dir=research'

# Set 1 — case-insensitive: distinctive terms with no generic-English use.
scan_ci() {
    grep -rnwIi $EXCLUDES \
        -e 'roblo[x]' \
        -e 'lsplas[h]' \
        -e 'rococ[o]' \
        -e 'screec[h]' \
        -e 'ston[k]' \
        -e 'amit[y]' \
        -e 'dup[e]' \
        "$@"
}

# Set 2 — case-sensitive whole-word: generic English words that are banned
# entity/game names only when capitalized, so case guards the false positives.
scan_cs() {
    grep -rnwI $EXCLUDES \
        -e 'DOOR[S]' \
        -e 'Rus[h]' \
        -e 'Figur[e]' \
        -e 'Hal[t]' \
        -e 'Glitc[h]' \
        -e 'Jef[f]' \
        -e 'Eye[s]' \
        -e 'Blin[k]' \
        "$@"
}

# scan ROOTS... — prints file:line:match per hit; 0 clean, 1 hit(s), 2 error.
scan() {
    status=0

    scan_ci "$@"
    rc=$?
    if [ "$rc" -eq 0 ]; then
        status=1
    elif [ "$rc" -ge 2 ]; then
        echo "ip-check: scan error (case-insensitive set)" >&2
        return 2
    fi

    scan_cs "$@"
    rc=$?
    if [ "$rc" -eq 0 ]; then
        status=1
    elif [ "$rc" -ge 2 ]; then
        echo "ip-check: scan error (case-sensitive set)" >&2
        return 2
    fi

    return "$status"
}

# Scan roots that exist (README* may be absent; a literal glob would error).
roots=''
for r in app scripts .github; do
    [ -e "$r" ] && roots="$roots $r"
done
for f in README*; do
    [ -f "$f" ] && roots="$roots $f"
done
if [ -z "$roots" ]; then
    echo "ip-check: no scan roots found under $PWD" >&2
    exit 2
fi

selftest() {
    tmp=$(mktemp -d 2>/dev/null)
    if [ -z "$tmp" ] || [ ! -d "$tmp" ]; then
        echo "ip-check: selftest: mktemp -d failed" >&2
        return 2
    fi
    # Built via %s so this script's own text never contains the banned word.
    printf 'Reference to the banned game: Roblo%s\n' x > "$tmp/planted.txt"

    scan "$tmp"
    rc=$?
    rm -rf "$tmp"
    if [ "$rc" -eq 0 ]; then
        echo "ip-check: SELFTEST FAIL: planted violation NOT detected" >&2
        return 1
    fi
    if [ "$rc" -ge 2 ]; then
        echo "ip-check: SELFTEST FAIL: scan error on planted violation" >&2
        return 2
    fi
    echo "ip-check: selftest 1/2 OK - planted violation detected"

    scan $roots
    rc=$?
    if [ "$rc" -ne 0 ]; then
        echo "ip-check: SELFTEST FAIL: repo scan not clean (exit $rc)" >&2
        return 1
    fi
    echo "ip-check: selftest 2/2 OK - repo clean (15 banned terms)"
    return 0
}

case "${1:-}" in
    --selftest)
        selftest
        ;;
    '')
        scan $roots
        rc=$?
        [ "$rc" -eq 0 ] && echo "ip-check: OK - no banned terms in shipped material"
        exit "$rc"
        ;;
    *)
        echo "usage: scripts/ip-check.sh [--selftest]" >&2
        exit 2
        ;;
esac
exit $?
