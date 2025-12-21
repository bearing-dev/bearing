package worktree

import (
	"bufio"
	"encoding/json"
	"os"
	"path/filepath"
)

// Entry represents a worktree or base repo
type Entry struct {
	Folder string `json:"folder"`
	Repo   string `json:"repo"`
	Branch string `json:"branch"`
	Base   bool   `json:"base"`
}

// State manages the worktrees.jsonl state file
type State struct {
	root string
}

// NewState creates a state manager for the given workspace root
func NewState(root string) *State {
	return &State{root: root}
}

func (s *State) path() string {
	return filepath.Join(s.root, "worktrees.jsonl")
}

// Read reads all entries
func (s *State) Read() ([]Entry, error) {
	return readJSONL[Entry](s.path())
}

// Write writes all entries
func (s *State) Write(entries []Entry) error {
	return writeJSONL(s.path(), entries)
}

// Append appends an entry
func (s *State) Append(entry Entry) error {
	return appendJSONL(s.path(), entry)
}

// Find finds an entry by folder name
func (s *State) Find(folder string) (*Entry, error) {
	entries, err := s.Read()
	if err != nil {
		return nil, err
	}
	for _, e := range entries {
		if e.Folder == folder {
			return &e, nil
		}
	}
	return nil, nil
}

// Remove removes an entry by folder name
func (s *State) Remove(folder string) error {
	entries, err := s.Read()
	if err != nil {
		return err
	}
	var filtered []Entry
	for _, e := range entries {
		if e.Folder != folder {
			filtered = append(filtered, e)
		}
	}
	return s.Write(filtered)
}

func readJSONL[T any](path string) ([]T, error) {
	f, err := os.Open(path)
	if os.IsNotExist(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var results []T
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}
		var item T
		if err := json.Unmarshal([]byte(line), &item); err != nil {
			return nil, err
		}
		results = append(results, item)
	}
	return results, scanner.Err()
}

func writeJSONL[T any](path string, items []T) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	for _, item := range items {
		data, err := json.Marshal(item)
		if err != nil {
			return err
		}
		f.Write(data)
		f.WriteString("\n")
	}
	return nil
}

func appendJSONL[T any](path string, item T) error {
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer f.Close()

	data, err := json.Marshal(item)
	if err != nil {
		return err
	}
	f.Write(data)
	f.WriteString("\n")
	return nil
}
