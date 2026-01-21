package daemon

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode"
)

// PlanSyncState tracks the last sync time for each plan file
type PlanSyncState struct {
	LastSync map[string]time.Time `json:"last_sync"` // file path -> last sync time
}

// PlanSyncResult holds the result of a sync cycle
type PlanSyncResult struct {
	Created   int
	Updated   int
	Skipped   int
	Errors    int
	APICalls  int
	LastSync  time.Time
}

// planFrontmatter holds parsed frontmatter from a plan file
type planFrontmatter struct {
	Issue  string
	Repo   string
	Status string
	Title  string
}

// LoadSyncState loads the sync state from ~/.bearing/plan-sync-state.json
func LoadSyncState(bearingDir string) (*PlanSyncState, error) {
	state := &PlanSyncState{
		LastSync: make(map[string]time.Time),
	}

	statePath := filepath.Join(bearingDir, "plan-sync-state.json")
	data, err := os.ReadFile(statePath)
	if err != nil {
		if os.IsNotExist(err) {
			return state, nil
		}
		return nil, err
	}

	if err := json.Unmarshal(data, state); err != nil {
		return nil, err
	}
	return state, nil
}

// SaveSyncState saves the sync state to ~/.bearing/plan-sync-state.json
func SaveSyncState(bearingDir string, state *PlanSyncState) error {
	statePath := filepath.Join(bearingDir, "plan-sync-state.json")
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(statePath, data, 0644)
}

// SyncPlans syncs plan files to GitHub issues
func (d *Daemon) SyncPlans() *PlanSyncResult {
	result := &PlanSyncResult{LastSync: time.Now()}

	cfg, err := LoadConfig(d.config.BearingDir)
	if err != nil {
		d.logPlanSync("Error loading config: %v", err)
		return result
	}

	if !cfg.PlanSync.Enabled {
		return result
	}

	state, err := LoadSyncState(d.config.BearingDir)
	if err != nil {
		d.logPlanSync("Error loading sync state: %v", err)
		return result
	}

	plansDir := filepath.Join(d.config.WorkspaceDir, "plans")

	// Find all plan files
	var planFiles []string
	err = filepath.Walk(plansDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip errors
		}
		if info.IsDir() {
			// Filter by project if configured
			if len(cfg.PlanSync.Projects) > 0 {
				relPath, _ := filepath.Rel(plansDir, path)
				if relPath != "." && !contains(cfg.PlanSync.Projects, relPath) {
					return filepath.SkipDir
				}
			}
			return nil
		}
		if filepath.Ext(path) == ".md" {
			planFiles = append(planFiles, path)
		}
		return nil
	})
	if err != nil {
		d.logPlanSync("Error walking plans dir: %v", err)
		return result
	}

	maxAPICalls := cfg.PlanSync.MaxAPICallsPerCycle
	if maxAPICalls <= 0 {
		maxAPICalls = 5
	}

	for _, pf := range planFiles {
		if result.APICalls >= maxAPICalls {
			d.logPlanSync("Rate limit reached (%d API calls), stopping", maxAPICalls)
			break
		}

		info, err := os.Stat(pf)
		if err != nil {
			result.Errors++
			continue
		}

		// Check if file modified since last sync
		lastSync, synced := state.LastSync[pf]
		if synced && !info.ModTime().After(lastSync) {
			result.Skipped++
			continue
		}

		fm, body, err := parsePlanFile(pf)
		if err != nil {
			d.logPlanSync("%s: error parsing (%v)", filepath.Base(pf), err)
			result.Errors++
			continue
		}

		// Auto-infer repo from path if missing
		if fm.Repo == "" {
			fm.Repo = inferRepoFromPath(pf)
			if fm.Repo == "" {
				d.logPlanSync("%s: no repo configured", filepath.Base(pf))
				result.Errors++
				continue
			}
		}

		// Auto-infer title from markdown heading if missing
		if fm.Title == "" {
			fm.Title = extractTitleFromBody(body)
			if fm.Title == "" {
				d.logPlanSync("%s: no title or heading", filepath.Base(pf))
				result.Errors++
				continue
			}
		}

		repoPath := d.getRepoPath(fm.Repo)
		body = strings.TrimSpace(body)

		if fm.Issue == "" {
			// Create new issue
			d.logPlanSync("%s: creating issue in %s...", filepath.Base(pf), fm.Repo)
			issueNum, err := d.createIssue(repoPath, pf, fm.Title, body)
			if err != nil {
				d.logPlanSync("%s: ERROR: %v", filepath.Base(pf), err)
				result.Errors++
			} else {
				d.logPlanSync("%s: created issue #%s", filepath.Base(pf), issueNum)
				result.Created++
				state.LastSync[pf] = time.Now()
			}
			result.APICalls++
		} else {
			// Update existing issue
			d.logPlanSync("%s: syncing to %s#%s...", filepath.Base(pf), fm.Repo, fm.Issue)
			if err := d.updateIssue(repoPath, fm.Issue, body); err != nil {
				d.logPlanSync("%s: ERROR: %v", filepath.Base(pf), err)
				result.Errors++
			} else {
				d.logPlanSync("%s: synced", filepath.Base(pf))
				result.Updated++
				state.LastSync[pf] = time.Now()
			}
			result.APICalls++
		}
	}

	// Save state
	if err := SaveSyncState(d.config.BearingDir, state); err != nil {
		d.logPlanSync("Error saving sync state: %v", err)
	}

	return result
}

func (d *Daemon) logPlanSync(format string, args ...interface{}) {
	msg := fmt.Sprintf(format, args...)
	logPath := filepath.Join(d.config.BearingDir, "plan-sync.log")

	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer f.Close()

	timestamp := time.Now().Format("2006-01-02 15:04:05")
	fmt.Fprintf(f, "[%s] %s\n", timestamp, msg)
}

func (d *Daemon) getRepoPath(projectName string) string {
	return filepath.Join(d.config.WorkspaceDir, projectName)
}

func (d *Daemon) createIssue(repoPath, planFile, title, body string) (string, error) {
	ghCmd := exec.Command("gh", "issue", "create",
		"--title", title,
		"--body", body,
		"--label", "plan")
	ghCmd.Dir = repoPath
	var stdout, stderr bytes.Buffer
	ghCmd.Stdout = &stdout
	ghCmd.Stderr = &stderr

	if err := ghCmd.Run(); err != nil {
		return "", fmt.Errorf("%w: %s", err, stderr.String())
	}

	// Parse issue number from output URL
	url := strings.TrimSpace(stdout.String())
	parts := strings.Split(url, "/")
	issueNum := parts[len(parts)-1]

	// Update frontmatter with issue number
	if err := updateFrontmatter(planFile, "issue", issueNum); err != nil {
		return issueNum, fmt.Errorf("created issue but failed to update frontmatter: %w", err)
	}

	return issueNum, nil
}

func (d *Daemon) updateIssue(repoPath, issueNum, body string) error {
	ghCmd := exec.Command("gh", "issue", "edit", issueNum, "--body", body)
	ghCmd.Dir = repoPath
	var stderr bytes.Buffer
	ghCmd.Stderr = &stderr

	if err := ghCmd.Run(); err != nil {
		return fmt.Errorf("%w: %s", err, stderr.String())
	}
	return nil
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// The following functions are copied from cli/plan_push.go to avoid import cycle

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
	lineNum := 0

	scanner := bufio.NewScanner(f)
	buf := make([]byte, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	for scanner.Scan() {
		line := scanner.Text()
		lineNum++

		if line == "---" {
			if !inFrontmatter && !frontmatterDone && lineNum == 1 {
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
				val = stripQuotes(val)
				if containsControlChars(val) {
					return nil, "", fmt.Errorf("frontmatter field %q contains invalid control characters", key)
				}
				switch key {
				case "issue":
					if val != "null" && val != "" {
						if !isNumeric(val) {
							return nil, "", fmt.Errorf("issue must be numeric, got: %q", val)
						}
						fm.Issue = val
					}
				case "repo":
					fm.Repo = val
				case "status":
					fm.Status = val
				case "title":
					fm.Title = val
				}
			}
		} else {
			body.WriteString(line)
			body.WriteString("\n")
		}
	}

	return fm, body.String(), scanner.Err()
}

func inferRepoFromPath(planFile string) string {
	absPath, err := filepath.Abs(planFile)
	if err != nil {
		return ""
	}
	parts := strings.Split(absPath, string(filepath.Separator))
	for i, part := range parts {
		if part == "plans" && i+1 < len(parts) {
			return parts[i+1]
		}
	}
	return ""
}

func extractTitleFromBody(body string) string {
	scanner := bufio.NewScanner(strings.NewReader(body))
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "# ") {
			return strings.TrimPrefix(line, "# ")
		}
	}
	return ""
}

func updateFrontmatter(planFile, key, value string) error {
	content, err := os.ReadFile(planFile)
	if err != nil {
		return err
	}

	lines := strings.Split(string(content), "\n")
	var result []string
	inFrontmatter := false
	updated := false

	for i, line := range lines {
		if line == "---" {
			if !inFrontmatter && i == 0 {
				inFrontmatter = true
				result = append(result, line)
				continue
			} else if inFrontmatter {
				if !updated {
					result = append(result, fmt.Sprintf("%s: %s", key, value))
				}
				inFrontmatter = false
			}
		}

		if inFrontmatter && strings.HasPrefix(line, key+":") {
			result = append(result, fmt.Sprintf("%s: %s", key, value))
			updated = true
			continue
		}

		result = append(result, line)
	}

	return os.WriteFile(planFile, []byte(strings.Join(result, "\n")), 0644)
}

func stripQuotes(s string) string {
	if len(s) >= 2 {
		if (s[0] == '"' && s[len(s)-1] == '"') || (s[0] == '\'' && s[len(s)-1] == '\'') {
			return s[1 : len(s)-1]
		}
	}
	return s
}

func containsControlChars(s string) bool {
	for _, r := range s {
		if r == 0 || (unicode.IsControl(r) && r != '\t') {
			return true
		}
	}
	return false
}

var numericRegex = regexp.MustCompile(`^\d+$`)

func isNumeric(s string) bool {
	return numericRegex.MatchString(s)
}
