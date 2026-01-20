package cli

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"
)

type ghIssue struct {
	Title  string `json:"title"`
	Body   string `json:"body"`
	Number int    `json:"number"`
}

var planPullCmd = &cobra.Command{
	Use:   "pull <repo> <issue>",
	Short: "Create a plan file from a GitHub issue",
	Args:  cobra.ExactArgs(2),
	RunE:  runPlanPull,
}

func init() {
	planCmd.AddCommand(planPullCmd)
}

func runPlanPull(cmd *cobra.Command, args []string) error {
	repo := args[0]
	issueNum := args[1]

	repoPath := filepath.Join(WorkspaceDir(), repo)

	// Fetch issue details using gh
	ghCmd := exec.Command("gh", "issue", "view", issueNum, "--json", "title,body,number")
	ghCmd.Dir = repoPath
	output, err := ghCmd.Output()
	if err != nil {
		return fmt.Errorf("failed to fetch issue: %w", err)
	}

	// Parse JSON response
	var issue ghIssue
	if err := json.Unmarshal(output, &issue); err != nil {
		return fmt.Errorf("failed to parse issue JSON: %w", err)
	}

	// Create plan file
	planDir := filepath.Join(WorkspaceDir(), "plans", repo)
	if err := os.MkdirAll(planDir, 0755); err != nil {
		return err
	}

	planFile := filepath.Join(planDir, fmt.Sprintf("%s.md", sanitizeFilename(issueNum)))

	content := fmt.Sprintf(`---
issue: %s
repo: %s
status: draft
---

# %s

%s
`, issueNum, repo, issue.Title, issue.Body)

	if err := os.WriteFile(planFile, []byte(content), 0644); err != nil {
		return err
	}

	fmt.Printf("Created plan file: %s\n", planFile)
	return nil
}

func sanitizeFilename(s string) string {
	s = strings.ReplaceAll(s, "/", "-")
	s = strings.ReplaceAll(s, " ", "-")
	return strings.ToLower(s)
}
