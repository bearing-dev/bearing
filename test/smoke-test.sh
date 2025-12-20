#!/bin/bash
# Smoke tests for Sailkit
# Run from repo root: ./test/smoke-test.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SAILKIT_DIR="$(dirname "$SCRIPT_DIR")"
TEST_DIR=$(mktemp -d)
PASSED=0
FAILED=0

cleanup() {
    rm -rf "$TEST_DIR"
}
trap cleanup EXIT

log() {
    echo "[TEST] $1"
}

pass() {
    echo "  ✓ $1"
    PASSED=$((PASSED + 1))
}

fail() {
    echo "  ✗ $1"
    FAILED=$((FAILED + 1))
}

# Setup test environment
setup() {
    log "Setting up test environment in $TEST_DIR"

    # Copy sailkit
    cp -r "$SAILKIT_DIR" "$TEST_DIR/sailkit-dev"

    # Clear manifest
    > "$TEST_DIR/sailkit-dev/manifest.jsonl"

    # Create a test repo
    git init --initial-branch=main "$TEST_DIR/test-repo" >/dev/null 2>&1
    echo "test" > "$TEST_DIR/test-repo/file.txt"
    git -C "$TEST_DIR/test-repo" add .
    git -C "$TEST_DIR/test-repo" commit -m "initial" >/dev/null 2>&1
}

# Test: worktree-new creates worktree
test_worktree_new() {
    log "Testing worktree-new"

    cd "$TEST_DIR"
    ./sailkit-dev/scripts/worktree-new test-repo feature-branch --purpose "Test feature" >/dev/null 2>&1

    if [ -d "$TEST_DIR/test-repo-feature-branch" ]; then
        pass "Worktree directory created"
    else
        fail "Worktree directory not created"
    fi

    if git -C "$TEST_DIR/test-repo-feature-branch" rev-parse --abbrev-ref HEAD | grep -q "feature-branch"; then
        pass "Worktree on correct branch"
    else
        fail "Worktree not on correct branch"
    fi

    if grep -q '"folder":"test-repo-feature-branch"' "$TEST_DIR/sailkit-dev/manifest.jsonl"; then
        pass "Manifest updated (JSONL)"
    else
        fail "Manifest not updated"
    fi

    if grep -q '"purpose":"Test feature"' "$TEST_DIR/sailkit-dev/manifest.jsonl"; then
        pass "Purpose recorded in manifest"
    else
        fail "Purpose not recorded"
    fi
}

# Test: worktree-cleanup removes worktree
test_worktree_cleanup() {
    log "Testing worktree-cleanup"

    cd "$TEST_DIR"
    ./sailkit-dev/scripts/worktree-cleanup test-repo feature-branch >/dev/null 2>&1

    if [ ! -d "$TEST_DIR/test-repo-feature-branch" ]; then
        pass "Worktree directory removed"
    else
        fail "Worktree directory not removed"
    fi

    if ! grep -q '"folder":"test-repo-feature-branch"' "$TEST_DIR/sailkit-dev/manifest.jsonl"; then
        pass "Manifest entry removed"
    else
        fail "Manifest entry not removed"
    fi
}

# Test: worktree-register adds base repo
test_worktree_register() {
    log "Testing worktree-register"

    cd "$TEST_DIR"
    ./sailkit-dev/scripts/worktree-register test-repo >/dev/null 2>&1

    if grep -q '"folder":"test-repo"' "$TEST_DIR/sailkit-dev/manifest.jsonl"; then
        pass "Base repo registered"
    else
        fail "Base repo not registered"
    fi

    if grep -q '"base":true' "$TEST_DIR/sailkit-dev/manifest.jsonl"; then
        pass "Marked as base"
    else
        fail "Not marked as base"
    fi
}

# Test: worktree-sync discovers worktrees
test_worktree_sync() {
    log "Testing worktree-sync"

    cd "$TEST_DIR"

    # Clear manifest
    > "$TEST_DIR/sailkit-dev/manifest.jsonl"

    # Manually create a worktree
    git -C "$TEST_DIR/test-repo" worktree add "$TEST_DIR/test-repo-manual-branch" -b manual-branch >/dev/null 2>&1

    # Sync should find it
    ./sailkit-dev/scripts/worktree-sync >/dev/null 2>&1

    if grep -q '"folder":"test-repo-manual-branch"' "$TEST_DIR/sailkit-dev/manifest.jsonl"; then
        pass "Sync found manually created worktree"
    else
        fail "Sync did not find manually created worktree"
    fi

    if grep -q '"folder":"test-repo"' "$TEST_DIR/sailkit-dev/manifest.jsonl"; then
        pass "Sync found base repo"
    else
        fail "Sync did not find base repo"
    fi
}

# Test: worktree-list displays table
test_worktree_list() {
    log "Testing worktree-list"

    cd "$TEST_DIR"
    OUTPUT=$(./sailkit-dev/scripts/worktree-list 2>&1)

    if echo "$OUTPUT" | grep -q "FOLDER"; then
        pass "List shows header"
    else
        fail "List missing header"
    fi

    if echo "$OUTPUT" | grep -q "test-repo"; then
        pass "List shows entries"
    else
        fail "List missing entries"
    fi
}

# Test: install.sh creates symlinks
test_install() {
    log "Testing install.sh"

    cd "$TEST_DIR"
    printf "1\ny\n" | ./sailkit-dev/install.sh >/dev/null 2>&1

    if [ -L "$TEST_DIR/.claude/skills/worktree" ]; then
        pass "Symlink created"
    else
        fail "Symlink not created"
    fi

    if [ -f "$TEST_DIR/.claude/skills/worktree/SKILL.md" ]; then
        pass "Skill file accessible via symlink"
    else
        fail "Skill file not accessible via symlink"
    fi
}

# Run tests
setup
test_worktree_new
test_worktree_cleanup
test_worktree_register
test_worktree_sync
test_worktree_list
test_install

# Summary
echo ""
echo "================================"
echo "Results: $PASSED passed, $FAILED failed"
echo "================================"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
