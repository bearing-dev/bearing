package cli

import (
	"bufio"
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"
)

var planPushDryRun bool

var planPushCmd = &cobra.Command{
	Use:   "push <file>",
	Short: "Push plan updates to GitHub issue",
	Args:  cobra.ExactArgs(1),
	RunE:  runPlanPush,
}

func init() {
	planPushCmd.Flags().BoolVar(&planPushDryRun, "dry-run", false, "show what would be pushed")
	planCmd.AddCommand(planPushCmd)
}

type planFrontmatter struct {
	Issue  string
	Repo   string
	Status string
}

func runPlanPush(cmd *cobra.Command, args []string) error {
	planFile := args[0]

	// Read and parse frontmatter
	fm, body, err := parsePlanFile(planFile)
	if err != nil {
		return err
	}

	if fm.Issue == "" {
		return fmt.Errorf("no issue number in frontmatter")
	}
	if fm.Repo == "" {
		return fmt.Errorf("no repo in frontmatter")
	}

	// Trim leading/trailing whitespace from body
	body = strings.TrimSpace(body)

	if planPushDryRun {
		fmt.Printf("Would update issue %s in %s:\n", fm.Issue, fm.Repo)
		fmt.Printf("Status: %s\n", fm.Status)
		fmt.Printf("Body:\n%s\n", body)
		return nil
	}

	// Push to GitHub using gh issue edit
	repoPath := filepath.Join(WorkspaceDir(), fm.Repo)
	ghCmd := exec.Command("gh", "issue", "edit", fm.Issue, "--body", body)
	ghCmd.Dir = repoPath
	var stderr bytes.Buffer
	ghCmd.Stderr = &stderr

	if err := ghCmd.Run(); err != nil {
		return fmt.Errorf("failed to update issue: %w\n%s", err, stderr.String())
	}

	fmt.Printf("Updated issue %s in %s\n", fm.Issue, fm.Repo)
	return nil
}

func parsePlanFile(path string) (*planFrontmatter, string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, "", err
	}
	defer f.Close()

	fm := &planFrontmatter{}
	var body strings.Builder
	inFrontmatter := false
	frontmatterDone := false

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()

		if line == "---" {
			if !inFrontmatter && !frontmatterDone {
				inFrontmatter = true
				continue
			} else if inFrontmatter {
				inFrontmatter = false
				frontmatterDone = true
				continue
			}
		}

		if inFrontmatter {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				key := strings.TrimSpace(parts[0])
				val := strings.TrimSpace(parts[1])
				switch key {
				case "issue":
					fm.Issue = val
				case "repo":
					fm.Repo = val
				case "status":
					fm.Status = val
				}
			}
		} else if frontmatterDone {
			body.WriteString(line)
			body.WriteString("\n")
		}
	}

	return fm, body.String(), scanner.Err()
}
