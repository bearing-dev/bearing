package cli

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestExtractIDFromFilename(t *testing.T) {
	tests := []struct {
		filename string
		expected string
	}{
		{"ppqiw-activity-feed.md", "ppqiw"},
		{"abc12-some-title.md", "abc12"},
		{"x-y.md", "x"},
		{"no-prefix.md", "no"},
		{"nodash.md", ""},
		{"", ""},
		{".md", ""},
		{"-leading-dash.md", ""},
		{"path/to/abc12-title.md", "abc12"},
	}

	for _, tc := range tests {
		t.Run(tc.filename, func(t *testing.T) {
			result := extractIDFromFilename(tc.filename)
			if result != tc.expected {
				t.Errorf("extractIDFromFilename(%q) = %q, want %q", tc.filename, result, tc.expected)
			}
		})
	}
}

func TestParsePlanForList(t *testing.T) {
	content := `---
repo: myrepo
status: in-progress
title: My Plan Title
---
# Plan Content

Some body content here.
`
	tmpFile := createPlanFile(t, content)

	info, err := parsePlanForList(tmpFile)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if info.Repo != "myrepo" {
		t.Errorf("expected repo myrepo, got %s", info.Repo)
	}
	if info.Status != "in-progress" {
		t.Errorf("expected status in-progress, got %s", info.Status)
	}
	if info.Title != "My Plan Title" {
		t.Errorf("expected title 'My Plan Title', got %s", info.Title)
	}
	if !strings.Contains(info.Content, "Plan Content") {
		t.Errorf("expected content to contain 'Plan Content', got %s", info.Content)
	}
}

func TestParsePlanForList_TitleFromBody(t *testing.T) {
	content := `---
repo: myrepo
status: draft
---
# Title From Body

Body content.
`
	tmpFile := createPlanFile(t, content)

	info, err := parsePlanForList(tmpFile)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if info.Title != "Title From Body" {
		t.Errorf("expected title 'Title From Body', got %s", info.Title)
	}
}

func TestParsePlanForList_NoTitle(t *testing.T) {
	content := `---
repo: myrepo
status: draft
---
No heading in body.
`
	tmpFile := createPlanFile(t, content)

	info, err := parsePlanForList(tmpFile)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if info.Title != "" {
		t.Errorf("expected empty title, got %s", info.Title)
	}
}

func TestParsePlanForList_MissingFrontmatter(t *testing.T) {
	content := `# Just a markdown file

No frontmatter here.
`
	tmpFile := createPlanFile(t, content)

	info, err := parsePlanForList(tmpFile)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Should extract title from body
	if info.Title != "Just a markdown file" {
		t.Errorf("expected title 'Just a markdown file', got %s", info.Title)
	}
	if info.Repo != "" {
		t.Errorf("expected empty repo, got %s", info.Repo)
	}
}

func TestParsePlanForList_MalformedFrontmatter(t *testing.T) {
	content := `---
repo: myrepo
invalid line without colon
status: draft
---
# Title

Body.
`
	tmpFile := createPlanFile(t, content)

	info, err := parsePlanForList(tmpFile)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Should parse what it can
	if info.Repo != "myrepo" {
		t.Errorf("expected repo myrepo, got %s", info.Repo)
	}
	if info.Status != "draft" {
		t.Errorf("expected status draft, got %s", info.Status)
	}
}

func TestLoadPlans_Empty(t *testing.T) {
	tmpDir := t.TempDir()
	origHome := os.Getenv("HOME")
	os.Setenv("HOME", tmpDir)
	defer os.Setenv("HOME", origHome)

	// Create plans directory but leave it empty
	plansDir := filepath.Join(tmpDir, "Projects", "plans")
	if err := os.MkdirAll(plansDir, 0755); err != nil {
		t.Fatalf("failed to create plans dir: %v", err)
	}

	plans, err := loadPlans("")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(plans) != 0 {
		t.Errorf("expected 0 plans, got %d", len(plans))
	}
}

func TestLoadPlans_WithPlans(t *testing.T) {
	tmpDir := t.TempDir()
	origHome := os.Getenv("HOME")
	os.Setenv("HOME", tmpDir)
	defer os.Setenv("HOME", origHome)

	// Create plans directory structure
	projectDir := filepath.Join(tmpDir, "Projects", "plans", "testproject")
	if err := os.MkdirAll(projectDir, 0755); err != nil {
		t.Fatalf("failed to create project dir: %v", err)
	}

	// Create plan files
	plan1 := `---
repo: testproject
status: draft
---
# Plan One
`
	plan2 := `---
repo: testproject
status: in-progress
---
# Plan Two
`
	if err := os.WriteFile(filepath.Join(projectDir, "abc12-plan-one.md"), []byte(plan1), 0644); err != nil {
		t.Fatalf("failed to write plan1: %v", err)
	}
	if err := os.WriteFile(filepath.Join(projectDir, "def34-plan-two.md"), []byte(plan2), 0644); err != nil {
		t.Fatalf("failed to write plan2: %v", err)
	}

	plans, err := loadPlans("")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(plans) != 2 {
		t.Fatalf("expected 2 plans, got %d", len(plans))
	}

	// Check IDs extracted from filenames
	ids := make(map[string]bool)
	for _, p := range plans {
		ids[p.ID] = true
	}
	if !ids["abc12"] {
		t.Error("expected plan with ID abc12")
	}
	if !ids["def34"] {
		t.Error("expected plan with ID def34")
	}
}

func TestLoadPlans_ProjectFilter(t *testing.T) {
	tmpDir := t.TempDir()
	origHome := os.Getenv("HOME")
	os.Setenv("HOME", tmpDir)
	defer os.Setenv("HOME", origHome)

	// Create plans for multiple projects
	proj1Dir := filepath.Join(tmpDir, "Projects", "plans", "project1")
	proj2Dir := filepath.Join(tmpDir, "Projects", "plans", "project2")
	if err := os.MkdirAll(proj1Dir, 0755); err != nil {
		t.Fatalf("failed to create proj1 dir: %v", err)
	}
	if err := os.MkdirAll(proj2Dir, 0755); err != nil {
		t.Fatalf("failed to create proj2 dir: %v", err)
	}

	plan := `---
status: draft
---
# Plan
`
	if err := os.WriteFile(filepath.Join(proj1Dir, "aaa11-plan.md"), []byte(plan), 0644); err != nil {
		t.Fatalf("failed to write: %v", err)
	}
	if err := os.WriteFile(filepath.Join(proj2Dir, "bbb22-plan.md"), []byte(plan), 0644); err != nil {
		t.Fatalf("failed to write: %v", err)
	}

	// Filter by project1
	plans, err := loadPlans("project1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(plans) != 1 {
		t.Fatalf("expected 1 plan, got %d", len(plans))
	}
	if plans[0].ID != "aaa11" {
		t.Errorf("expected ID aaa11, got %s", plans[0].ID)
	}
}

func TestLoadPlans_RepoFromDirectory(t *testing.T) {
	tmpDir := t.TempDir()
	origHome := os.Getenv("HOME")
	os.Setenv("HOME", tmpDir)
	defer os.Setenv("HOME", origHome)

	// Create plan without repo in frontmatter
	projectDir := filepath.Join(tmpDir, "Projects", "plans", "myproject")
	if err := os.MkdirAll(projectDir, 0755); err != nil {
		t.Fatalf("failed to create project dir: %v", err)
	}

	plan := `---
status: draft
---
# Plan Without Repo
`
	if err := os.WriteFile(filepath.Join(projectDir, "xyz99-plan.md"), []byte(plan), 0644); err != nil {
		t.Fatalf("failed to write: %v", err)
	}

	plans, err := loadPlans("")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(plans) != 1 {
		t.Fatalf("expected 1 plan, got %d", len(plans))
	}
	// Repo should be inferred from directory name
	if plans[0].Repo != "myproject" {
		t.Errorf("expected repo myproject, got %s", plans[0].Repo)
	}
}

func TestLoadPlans_SkipsNonMdFiles(t *testing.T) {
	tmpDir := t.TempDir()
	origHome := os.Getenv("HOME")
	os.Setenv("HOME", tmpDir)
	defer os.Setenv("HOME", origHome)

	projectDir := filepath.Join(tmpDir, "Projects", "plans", "testproject")
	if err := os.MkdirAll(projectDir, 0755); err != nil {
		t.Fatalf("failed to create project dir: %v", err)
	}

	// Create various file types
	plan := `---
status: draft
---
# Plan
`
	if err := os.WriteFile(filepath.Join(projectDir, "abc12-plan.md"), []byte(plan), 0644); err != nil {
		t.Fatalf("failed to write: %v", err)
	}
	if err := os.WriteFile(filepath.Join(projectDir, "notes.txt"), []byte("not a plan"), 0644); err != nil {
		t.Fatalf("failed to write: %v", err)
	}
	if err := os.WriteFile(filepath.Join(projectDir, "data.json"), []byte("{}"), 0644); err != nil {
		t.Fatalf("failed to write: %v", err)
	}

	plans, err := loadPlans("")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Should only find the .md file
	if len(plans) != 1 {
		t.Errorf("expected 1 plan, got %d", len(plans))
	}
}

func TestLoadPlans_SkipsDirectories(t *testing.T) {
	tmpDir := t.TempDir()
	origHome := os.Getenv("HOME")
	os.Setenv("HOME", tmpDir)
	defer os.Setenv("HOME", origHome)

	projectDir := filepath.Join(tmpDir, "Projects", "plans", "testproject")
	if err := os.MkdirAll(projectDir, 0755); err != nil {
		t.Fatalf("failed to create project dir: %v", err)
	}

	// Create a subdirectory that ends with .md (edge case)
	subDir := filepath.Join(projectDir, "subdir.md")
	if err := os.MkdirAll(subDir, 0755); err != nil {
		t.Fatalf("failed to create subdir: %v", err)
	}

	plans, err := loadPlans("")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(plans) != 0 {
		t.Errorf("expected 0 plans, got %d", len(plans))
	}
}

func TestLoadPlans_NonexistentProject(t *testing.T) {
	tmpDir := t.TempDir()
	origHome := os.Getenv("HOME")
	os.Setenv("HOME", tmpDir)
	defer os.Setenv("HOME", origHome)

	plansDir := filepath.Join(tmpDir, "Projects", "plans")
	if err := os.MkdirAll(plansDir, 0755); err != nil {
		t.Fatalf("failed to create plans dir: %v", err)
	}

	// Filter by nonexistent project
	plans, err := loadPlans("nonexistent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(plans) != 0 {
		t.Errorf("expected 0 plans, got %d", len(plans))
	}
}

// Search tests

func TestPlanSearch_MatchesTitle(t *testing.T) {
	tmpDir := t.TempDir()
	origHome := os.Getenv("HOME")
	os.Setenv("HOME", tmpDir)
	defer os.Setenv("HOME", origHome)

	projectDir := filepath.Join(tmpDir, "Projects", "plans", "testproject")
	if err := os.MkdirAll(projectDir, 0755); err != nil {
		t.Fatalf("failed to create project dir: %v", err)
	}

	plan := `---
status: draft
---
# Activity Feed Implementation

Body without search term.
`
	if err := os.WriteFile(filepath.Join(projectDir, "abc12-activity.md"), []byte(plan), 0644); err != nil {
		t.Fatalf("failed to write: %v", err)
	}

	plans, err := loadPlans("")
	if err != nil {
		t.Fatalf("failed to load: %v", err)
	}
	if len(plans) != 1 {
		t.Fatalf("expected 1 plan, got %d", len(plans))
	}

	// Simulate search logic
	query := "activity"
	found := false
	for _, p := range plans {
		titleLower := strings.ToLower(p.Title)
		if strings.Contains(titleLower, query) {
			found = true
		}
	}
	if !found {
		t.Error("expected to find plan by title search")
	}
}

func TestPlanSearch_MatchesContent(t *testing.T) {
	tmpDir := t.TempDir()
	origHome := os.Getenv("HOME")
	os.Setenv("HOME", tmpDir)
	defer os.Setenv("HOME", origHome)

	projectDir := filepath.Join(tmpDir, "Projects", "plans", "testproject")
	if err := os.MkdirAll(projectDir, 0755); err != nil {
		t.Fatalf("failed to create project dir: %v", err)
	}

	plan := `---
status: draft
---
# Generic Title

This plan implements the daemon watcher feature.
`
	if err := os.WriteFile(filepath.Join(projectDir, "abc12-daemon.md"), []byte(plan), 0644); err != nil {
		t.Fatalf("failed to write: %v", err)
	}

	plans, err := loadPlans("")
	if err != nil {
		t.Fatalf("failed to load: %v", err)
	}

	// Search for content term
	query := "daemon watcher"
	found := false
	for _, p := range plans {
		contentLower := strings.ToLower(p.Content)
		if strings.Contains(contentLower, query) {
			found = true
		}
	}
	if !found {
		t.Error("expected to find plan by content search")
	}
}

func TestPlanSearch_CaseInsensitive(t *testing.T) {
	tmpDir := t.TempDir()
	origHome := os.Getenv("HOME")
	os.Setenv("HOME", tmpDir)
	defer os.Setenv("HOME", origHome)

	projectDir := filepath.Join(tmpDir, "Projects", "plans", "testproject")
	if err := os.MkdirAll(projectDir, 0755); err != nil {
		t.Fatalf("failed to create project dir: %v", err)
	}

	plan := `---
status: draft
---
# UPPERCASE TITLE

BODY WITH UPPERCASE.
`
	if err := os.WriteFile(filepath.Join(projectDir, "abc12-upper.md"), []byte(plan), 0644); err != nil {
		t.Fatalf("failed to write: %v", err)
	}

	plans, err := loadPlans("")
	if err != nil {
		t.Fatalf("failed to load: %v", err)
	}

	// Search with lowercase
	query := "uppercase"
	found := false
	for _, p := range plans {
		titleLower := strings.ToLower(p.Title)
		contentLower := strings.ToLower(p.Content)
		if strings.Contains(titleLower, query) || strings.Contains(contentLower, query) {
			found = true
		}
	}
	if !found {
		t.Error("expected case-insensitive search to work")
	}
}

func TestPlanSearch_NoMatch(t *testing.T) {
	tmpDir := t.TempDir()
	origHome := os.Getenv("HOME")
	os.Setenv("HOME", tmpDir)
	defer os.Setenv("HOME", origHome)

	projectDir := filepath.Join(tmpDir, "Projects", "plans", "testproject")
	if err := os.MkdirAll(projectDir, 0755); err != nil {
		t.Fatalf("failed to create project dir: %v", err)
	}

	plan := `---
status: draft
---
# Some Plan

Some content.
`
	if err := os.WriteFile(filepath.Join(projectDir, "abc12-plan.md"), []byte(plan), 0644); err != nil {
		t.Fatalf("failed to write: %v", err)
	}

	plans, err := loadPlans("")
	if err != nil {
		t.Fatalf("failed to load: %v", err)
	}

	query := "nonexistent term xyz123"
	found := false
	for _, p := range plans {
		titleLower := strings.ToLower(p.Title)
		contentLower := strings.ToLower(p.Content)
		if strings.Contains(titleLower, query) || strings.Contains(contentLower, query) {
			found = true
		}
	}
	if found {
		t.Error("should not find match for nonexistent term")
	}
}

// Helper function
func createPlanFile(t *testing.T, content string) string {
	t.Helper()
	tmpDir := t.TempDir()
	tmpFile := filepath.Join(tmpDir, "test-plan.md")
	if err := os.WriteFile(tmpFile, []byte(content), 0644); err != nil {
		t.Fatalf("failed to create plan file: %v", err)
	}
	return tmpFile
}
