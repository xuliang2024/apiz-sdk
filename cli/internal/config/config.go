// Package config reads and writes the apiz CLI's TOML profile config at
// ~/.config/apiz/config.toml.
package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Profile is one set of credentials.
type Profile struct {
	APIKey  string `toml:"api_key"`
	BaseURL string `toml:"base_url"`
}

// File represents the on-disk config (multiple profiles).
type File struct {
	DefaultProfile string             `toml:"default_profile"`
	Profiles       map[string]Profile `toml:"profile"`
}

// DefaultPath returns ~/.config/apiz/config.toml (XDG_CONFIG_HOME aware).
func DefaultPath() (string, error) {
	if v := os.Getenv("APIZ_CONFIG_PATH"); v != "" {
		return v, nil
	}
	if v := os.Getenv("XDG_CONFIG_HOME"); v != "" {
		return filepath.Join(v, "apiz", "config.toml"), nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("locate home dir: %w", err)
	}
	return filepath.Join(home, ".config", "apiz", "config.toml"), nil
}

// Load reads and parses the config file, returning an empty File when missing.
func Load(path string) (*File, error) {
	if path == "" {
		var err error
		path, err = DefaultPath()
		if err != nil {
			return nil, err
		}
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return &File{Profiles: map[string]Profile{}}, nil
		}
		return nil, fmt.Errorf("read %s: %w", path, err)
	}
	return parse(string(data))
}

// Save writes the config file with mode 0600.
func Save(path string, file *File) error {
	if path == "" {
		var err error
		path, err = DefaultPath()
		if err != nil {
			return err
		}
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return fmt.Errorf("mkdir %s: %w", filepath.Dir(path), err)
	}
	body := serialize(file)
	if err := os.WriteFile(path, []byte(body), 0o600); err != nil {
		return fmt.Errorf("write %s: %w", path, err)
	}
	return nil
}

// SetProfile inserts or updates the named profile.
func (f *File) SetProfile(name string, p Profile) {
	if f.Profiles == nil {
		f.Profiles = map[string]Profile{}
	}
	f.Profiles[name] = p
	if f.DefaultProfile == "" {
		f.DefaultProfile = name
	}
}

// Resolve picks a profile by name (or DefaultProfile if name is empty).
func (f *File) Resolve(name string) (Profile, bool) {
	if name == "" {
		name = f.DefaultProfile
	}
	p, ok := f.Profiles[name]
	return p, ok
}

// ---- Minimal TOML parser tailored for our schema -----------------------------
// We keep this in-house to avoid pulling a TOML library for a CLI that only
// needs to round-trip a tiny well-formed config file.

func parse(content string) (*File, error) {
	file := &File{Profiles: map[string]Profile{}}
	current := ""
	for _, raw := range strings.Split(content, "\n") {
		line := strings.TrimSpace(raw)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if strings.HasPrefix(line, "[profile.") && strings.HasSuffix(line, "]") {
			current = strings.TrimSuffix(strings.TrimPrefix(line, "[profile."), "]")
			if _, ok := file.Profiles[current]; !ok {
				file.Profiles[current] = Profile{}
			}
			continue
		}
		if strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]") {
			current = strings.Trim(line, "[]")
			continue
		}
		key, value, ok := splitKV(line)
		if !ok {
			continue
		}
		switch current {
		case "":
			if key == "default_profile" {
				file.DefaultProfile = value
			}
		default:
			p := file.Profiles[current]
			switch key {
			case "api_key":
				p.APIKey = value
			case "base_url":
				p.BaseURL = value
			}
			file.Profiles[current] = p
		}
	}
	return file, nil
}

func serialize(file *File) string {
	var sb strings.Builder
	sb.WriteString("# apiz CLI config — managed by `apiz auth` commands.\n")
	if file.DefaultProfile != "" {
		fmt.Fprintf(&sb, "default_profile = %q\n", file.DefaultProfile)
	}
	names := make([]string, 0, len(file.Profiles))
	for n := range file.Profiles {
		names = append(names, n)
	}
	sort.Strings(names)
	for _, n := range names {
		p := file.Profiles[n]
		sb.WriteString("\n[profile." + n + "]\n")
		if p.APIKey != "" {
			fmt.Fprintf(&sb, "api_key = %q\n", p.APIKey)
		}
		if p.BaseURL != "" {
			fmt.Fprintf(&sb, "base_url = %q\n", p.BaseURL)
		}
	}
	return sb.String()
}

func splitKV(line string) (string, string, bool) {
	eq := strings.IndexByte(line, '=')
	if eq <= 0 {
		return "", "", false
	}
	key := strings.TrimSpace(line[:eq])
	val := strings.TrimSpace(line[eq+1:])
	val = strings.Trim(val, `"'`)
	return key, val, true
}
