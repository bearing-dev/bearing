package daemon

import (
	"testing"

	"github.com/joshribakoff/bearing/internal/gh"
	"github.com/joshribakoff/bearing/internal/jsonl"
)

// MockGHClient implements GHClient interface for testing
type MockGHClient struct {
	PR    *gh.PRInfo
	Error error
}

func (m *MockGHClient) GetPR(branch string) (*gh.PRInfo, error) {
	return m.PR, m.Error
}

// MockRepo implements GitRepo interface for testing
type MockRepo struct {
	Commit  string
	Message string
	Error   error
}

func (m *MockRepo) HeadCommit() (string, error) {
	return m.Commit, m.Error
}

func (m *MockRepo) CommitMessage(commit string) (string, error) {
	return m.Message, m.Error
}

// TestActivityTracker_PRStateChanges tests PR state change detection via CheckForActivity
func TestActivityTracker_PRStateChanges(t *testing.T) {
	entry := jsonl.LocalEntry{
		Folder: "test-worktree",
		Repo:   "owner/repo",
		Branch: "feature-branch",
		Base:   false,
	}

	t.Run("first check records state without emitting event", func(t *testing.T) {
		tmpDir := t.TempDir()
		store := jsonl.NewStore(tmpDir)
		tracker := NewActivityTracker(store)

		mockGH := &MockGHClient{PR: &gh.PRInfo{State: "OPEN", Number: 42, Title: "Test PR"}}
		mockRepo := &MockRepo{Commit: "abc1234", Message: "Initial commit"}

		tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)

		events, _ := store.ReadActivity()
		if len(events) != 0 {
			t.Errorf("expected no events on first check, got %d", len(events))
		}
	})

	t.Run("state change from OPEN to MERGED emits pr_merged", func(t *testing.T) {
		tmpDir := t.TempDir()
		store := jsonl.NewStore(tmpDir)
		tracker := NewActivityTracker(store)

		mockGH := &MockGHClient{PR: &gh.PRInfo{State: "OPEN", Number: 42, Title: "Test PR"}}
		mockRepo := &MockRepo{Commit: "abc1234", Message: "Initial commit"}

		// First check - records state
		tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)

		// Change state to MERGED
		mockGH.PR.State = "MERGED"
		tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)

		events, err := store.ReadActivity()
		if err != nil {
			t.Fatal(err)
		}

		if len(events) != 1 {
			t.Fatalf("expected 1 event, got %d", len(events))
		}
		if events[0].Type != "pr_merged" {
			t.Errorf("expected pr_merged event, got %s", events[0].Type)
		}
		if events[0].PRNumber != 42 {
			t.Errorf("expected PR number 42, got %d", events[0].PRNumber)
		}
		if events[0].Repo != "owner/repo" {
			t.Errorf("expected repo owner/repo, got %s", events[0].Repo)
		}
		if events[0].Branch != "feature-branch" {
			t.Errorf("expected branch feature-branch, got %s", events[0].Branch)
		}
	})

	t.Run("state change from OPEN to CLOSED emits pr_closed", func(t *testing.T) {
		tmpDir := t.TempDir()
		store := jsonl.NewStore(tmpDir)
		tracker := NewActivityTracker(store)

		mockGH := &MockGHClient{PR: &gh.PRInfo{State: "OPEN", Number: 99, Title: "Close me"}}
		mockRepo := &MockRepo{Commit: "abc1234"}

		tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)
		mockGH.PR.State = "CLOSED"
		tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)

		events, _ := store.ReadActivity()
		if len(events) != 1 || events[0].Type != "pr_closed" {
			t.Errorf("expected pr_closed event, got %v", events)
		}
	})

	t.Run("no event when state unchanged", func(t *testing.T) {
		tmpDir := t.TempDir()
		store := jsonl.NewStore(tmpDir)
		tracker := NewActivityTracker(store)

		mockGH := &MockGHClient{PR: &gh.PRInfo{State: "OPEN", Number: 42}}
		mockRepo := &MockRepo{Commit: "abc1234"}

		tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)
		tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)
		tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)

		events, _ := store.ReadActivity()
		if len(events) != 0 {
			t.Errorf("expected 0 events for unchanged state, got %d", len(events))
		}
	})

	t.Run("no PR found does not emit event", func(t *testing.T) {
		tmpDir := t.TempDir()
		store := jsonl.NewStore(tmpDir)
		tracker := NewActivityTracker(store)

		mockGH := &MockGHClient{PR: nil, Error: nil}
		mockRepo := &MockRepo{Commit: "abc1234"}

		tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)

		events, _ := store.ReadActivity()
		if len(events) != 0 {
			t.Errorf("expected 0 events when no PR, got %d", len(events))
		}
	})
}

// TestActivityTracker_CommitDetection tests commit change detection via CheckForActivity
func TestActivityTracker_CommitDetection(t *testing.T) {
	entry := jsonl.LocalEntry{
		Folder: "test-worktree",
		Repo:   "owner/repo",
		Branch: "feature-branch",
		Base:   false,
	}

	t.Run("first commit check records without emitting event", func(t *testing.T) {
		tmpDir := t.TempDir()
		store := jsonl.NewStore(tmpDir)
		tracker := NewActivityTracker(store)

		mockGH := &MockGHClient{PR: nil}
		mockRepo := &MockRepo{Commit: "abc1234", Message: "Initial commit"}

		tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)

		events, _ := store.ReadActivity()
		if len(events) != 0 {
			t.Errorf("expected 0 events on first check, got %d", len(events))
		}
	})

	t.Run("new commit emits commit_pushed event", func(t *testing.T) {
		tmpDir := t.TempDir()
		store := jsonl.NewStore(tmpDir)
		tracker := NewActivityTracker(store)

		mockGH := &MockGHClient{PR: nil}
		mockRepo := &MockRepo{Commit: "abc1234", Message: "Initial commit"}

		// First check
		tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)

		// New commit
		mockRepo.Commit = "def5678"
		mockRepo.Message = "Add new feature"
		tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)

		events, err := store.ReadActivity()
		if err != nil {
			t.Fatal(err)
		}

		if len(events) != 1 {
			t.Fatalf("expected 1 event, got %d", len(events))
		}
		if events[0].Type != "commit_pushed" {
			t.Errorf("expected commit_pushed, got %s", events[0].Type)
		}
		if events[0].Commit != "def5678" {
			t.Errorf("expected commit def5678, got %s", events[0].Commit)
		}
		if events[0].Message != "Add new feature" {
			t.Errorf("expected message 'Add new feature', got %s", events[0].Message)
		}
	})

	t.Run("same commit does not emit event", func(t *testing.T) {
		tmpDir := t.TempDir()
		store := jsonl.NewStore(tmpDir)
		tracker := NewActivityTracker(store)

		mockGH := &MockGHClient{PR: nil}
		mockRepo := &MockRepo{Commit: "abc1234"}

		tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)
		tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)
		tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)

		events, _ := store.ReadActivity()
		if len(events) != 0 {
			t.Errorf("expected 0 events for same commit, got %d", len(events))
		}
	})

	t.Run("multiple commits emit multiple events", func(t *testing.T) {
		tmpDir := t.TempDir()
		store := jsonl.NewStore(tmpDir)
		tracker := NewActivityTracker(store)

		mockGH := &MockGHClient{PR: nil}
		mockRepo := &MockRepo{Commit: "commit1", Message: "First"}

		tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)

		mockRepo.Commit = "commit2"
		mockRepo.Message = "Second"
		tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)

		mockRepo.Commit = "commit3"
		mockRepo.Message = "Third"
		tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)

		events, _ := store.ReadActivity()
		if len(events) != 2 {
			t.Errorf("expected 2 events, got %d", len(events))
		}
	})
}

// TestActivityTracker_BaseWorktreeSkipsPR tests that base worktrees skip PR checks
func TestActivityTracker_BaseWorktreeSkipsPR(t *testing.T) {
	tmpDir := t.TempDir()
	store := jsonl.NewStore(tmpDir)
	tracker := NewActivityTracker(store)

	entry := jsonl.LocalEntry{
		Folder: "base-worktree",
		Repo:   "owner/repo",
		Branch: "main",
		Base:   true,
	}

	// Mock returns PR - but it should be ignored for base worktrees
	mockGH := &MockGHClient{PR: &gh.PRInfo{State: "OPEN", Number: 1}}
	mockRepo := &MockRepo{Commit: "abc1234"}

	// First call
	tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)
	// Change PR state - should NOT trigger event for base worktree
	mockGH.PR.State = "MERGED"
	tracker.CheckForActivity("/path/to/worktree", entry, mockGH, mockRepo)

	events, _ := store.ReadActivity()
	// Should have no PR events (base worktrees skip PR checks)
	for _, e := range events {
		if e.Type == "pr_merged" || e.Type == "pr_opened" || e.Type == "pr_closed" {
			t.Errorf("base worktree should not emit PR events, got %s", e.Type)
		}
	}
}

// TestActivityTracker_PRStateTransitions tests all valid PR state transitions end-to-end
func TestActivityTracker_PRStateTransitions(t *testing.T) {
	entry := jsonl.LocalEntry{
		Folder: "test-worktree",
		Repo:   "owner/repo",
		Branch: "feature-branch",
		Base:   false,
	}

	tests := []struct {
		name       string
		fromState  string
		toState    string
		wantEvent  string
		shouldEmit bool
	}{
		{"OPEN to MERGED", "OPEN", "MERGED", "pr_merged", true},
		{"OPEN to CLOSED", "OPEN", "CLOSED", "pr_closed", true},
		{"MERGED to OPEN", "MERGED", "OPEN", "pr_opened", true},
		{"CLOSED to OPEN", "CLOSED", "OPEN", "pr_opened", true},
		{"OPEN to OPEN", "OPEN", "OPEN", "", false},
		{"MERGED to MERGED", "MERGED", "MERGED", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tmpDir := t.TempDir()
			store := jsonl.NewStore(tmpDir)
			tracker := NewActivityTracker(store)

			mockGH := &MockGHClient{PR: &gh.PRInfo{State: tt.fromState, Number: 42}}
			mockRepo := &MockRepo{Commit: "abc1234"}

			// First check - records state
			tracker.CheckForActivity("/path", entry, mockGH, mockRepo)

			// Change state
			mockGH.PR.State = tt.toState
			tracker.CheckForActivity("/path", entry, mockGH, mockRepo)

			events, _ := store.ReadActivity()

			if tt.shouldEmit {
				if len(events) != 1 {
					t.Fatalf("expected 1 event, got %d", len(events))
				}
				if events[0].Type != tt.wantEvent {
					t.Errorf("expected %s, got %s", tt.wantEvent, events[0].Type)
				}
			} else {
				if len(events) != 0 {
					t.Errorf("expected no events, got %d", len(events))
				}
			}
		})
	}
}

// TestActivityTracker_MultipleFolders tests independent tracking per folder
func TestActivityTracker_MultipleFolders(t *testing.T) {
	tmpDir := t.TempDir()
	store := jsonl.NewStore(tmpDir)
	tracker := NewActivityTracker(store)

	entryA := jsonl.LocalEntry{Folder: "folder-a", Repo: "owner/repo-a", Branch: "branch-a", Base: false}
	entryB := jsonl.LocalEntry{Folder: "folder-b", Repo: "owner/repo-b", Branch: "branch-b", Base: false}

	mockGHA := &MockGHClient{PR: &gh.PRInfo{State: "OPEN", Number: 1}}
	mockGHB := &MockGHClient{PR: &gh.PRInfo{State: "OPEN", Number: 2}}
	mockRepoA := &MockRepo{Commit: "commit-a"}
	mockRepoB := &MockRepo{Commit: "commit-b"}

	// First checks - record state
	tracker.CheckForActivity("/path/a", entryA, mockGHA, mockRepoA)
	tracker.CheckForActivity("/path/b", entryB, mockGHB, mockRepoB)

	// Change only folder-a's PR state
	mockGHA.PR.State = "MERGED"
	tracker.CheckForActivity("/path/a", entryA, mockGHA, mockRepoA)
	tracker.CheckForActivity("/path/b", entryB, mockGHB, mockRepoB)

	events, _ := store.ReadActivity()
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].Repo != "owner/repo-a" {
		t.Errorf("expected event from repo-a, got %s", events[0].Repo)
	}
}

// TestActivityTracker_CombinedPRAndCommit tests PR and commit events in same check
func TestActivityTracker_CombinedPRAndCommit(t *testing.T) {
	tmpDir := t.TempDir()
	store := jsonl.NewStore(tmpDir)
	tracker := NewActivityTracker(store)

	entry := jsonl.LocalEntry{
		Folder: "test-worktree",
		Repo:   "owner/repo",
		Branch: "feature-branch",
		Base:   false,
	}

	mockGH := &MockGHClient{PR: &gh.PRInfo{State: "OPEN", Number: 42}}
	mockRepo := &MockRepo{Commit: "abc1234", Message: "Initial"}

	// First check
	tracker.CheckForActivity("/path", entry, mockGH, mockRepo)

	// Both PR and commit change
	mockGH.PR.State = "MERGED"
	mockRepo.Commit = "def5678"
	mockRepo.Message = "Final commit"
	tracker.CheckForActivity("/path", entry, mockGH, mockRepo)

	events, _ := store.ReadActivity()
	if len(events) != 2 {
		t.Fatalf("expected 2 events, got %d", len(events))
	}

	hasCommit := false
	hasPR := false
	for _, e := range events {
		if e.Type == "commit_pushed" {
			hasCommit = true
		}
		if e.Type == "pr_merged" {
			hasPR = true
		}
	}
	if !hasCommit {
		t.Error("missing commit_pushed event")
	}
	if !hasPR {
		t.Error("missing pr_merged event")
	}
}

// TestNewActivityTracker tests tracker initialization
func TestNewActivityTracker(t *testing.T) {
	tmpDir := t.TempDir()
	store := jsonl.NewStore(tmpDir)
	tracker := NewActivityTracker(store)

	if tracker == nil {
		t.Fatal("expected non-nil tracker")
	}
	if tracker.store != store {
		t.Error("store not set correctly")
	}
	if tracker.prStates == nil {
		t.Error("prStates map not initialized")
	}
	if tracker.commits == nil {
		t.Error("commits map not initialized")
	}
}
