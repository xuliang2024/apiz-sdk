// Package cmd implements the apiz CLI command tree.
package cmd

import (
	"context"
	"fmt"
	"io"
	"os"
	"strconv"
	"time"

	"github.com/spf13/cobra"

	"github.com/apiz-ai/apiz-cli/internal/api"
	"github.com/apiz-ai/apiz-cli/internal/config"
)

// Version is overridden at link time by goreleaser.
var Version = "0.0.0-dev"

// runtime config carried by the root command.
type rootFlags struct {
	apiKey      string
	baseURL     string
	timeout     time.Duration
	maxRetries  int
	profile     string
	configPath  string
	outputJSON  bool
	outputYAML  bool
	outputTable bool
}

// New constructs a fresh root command bound to stdin / stdout / stderr.
//
// The factory shape keeps tests cheap: each test can build its own root,
// inject a mock backend (via APIZ_BASE_URL or --base-url) and capture output.
func New(out, errOut io.Writer) *cobra.Command {
	flags := &rootFlags{}
	root := &cobra.Command{
		Use:           "apiz",
		Short:         "apiz — Official CLI for the apiz.ai AI generation platform",
		SilenceUsage:  true,
		SilenceErrors: false,
		Version:       Version,
	}
	root.SetOut(out)
	root.SetErr(errOut)

	root.PersistentFlags().StringVar(&flags.apiKey, "api-key", "", "Bearer token (sk-...) — overrides env / profile")
	root.PersistentFlags().StringVar(&flags.baseURL, "base-url", "", "Backend URL (default https://api.apiz.ai)")
	root.PersistentFlags().DurationVar(&flags.timeout, "timeout", 0, "Request timeout (e.g. 30s, 2m)")
	root.PersistentFlags().IntVar(&flags.maxRetries, "max-retries", 0, "Retries for transient failures (default 2)")
	root.PersistentFlags().StringVar(&flags.profile, "profile", "", "Profile name from ~/.config/apiz/config.toml")
	root.PersistentFlags().StringVar(&flags.configPath, "config", "", "Override config file path")
	root.PersistentFlags().BoolVar(&flags.outputJSON, "json", false, "Output as JSON (default for non-TTY)")
	root.PersistentFlags().BoolVar(&flags.outputYAML, "yaml", false, "Output as YAML")
	root.PersistentFlags().BoolVar(&flags.outputTable, "table", false, "Output as a human table")

	root.AddCommand(newAuthCmd(flags))
	root.AddCommand(newAccountCmd(flags))
	root.AddCommand(newModelsCmd(flags))
	root.AddCommand(newTasksCmd(flags))
	root.AddCommand(newGenerateCmd(flags))
	root.AddCommand(newVoicesCmd(flags))
	root.AddCommand(newSpeakCmd(flags))
	root.AddCommand(newParseCmd(flags))
	root.AddCommand(newTransferCmd(flags))

	return root
}

// Execute runs the CLI with the user's argv.
func Execute() int {
	root := New(os.Stdout, os.Stderr)
	if err := root.Execute(); err != nil {
		return 1
	}
	return 0
}

// resolveClient wires up an api.Client honoring the priority order:
// flag > env > profile > default.
func (f *rootFlags) resolveClient() (*api.Client, error) {
	apiKey := f.apiKey
	baseURL := f.baseURL

	if apiKey == "" {
		if v := os.Getenv("APIZ_API_KEY"); v != "" {
			apiKey = v
		} else if v := os.Getenv("XSKILL_API_KEY"); v != "" {
			apiKey = v
		}
	}
	if baseURL == "" {
		baseURL = os.Getenv("APIZ_BASE_URL")
	}

	if apiKey == "" || baseURL == "" {
		file, err := config.Load(f.configPath)
		if err == nil {
			if p, ok := file.Resolve(f.profile); ok {
				if apiKey == "" {
					apiKey = p.APIKey
				}
				if baseURL == "" {
					baseURL = p.BaseURL
				}
			}
		}
	}

	timeout := f.timeout
	if timeout == 0 {
		if v := os.Getenv("APIZ_TIMEOUT"); v != "" {
			if n, err := strconv.Atoi(v); err == nil {
				timeout = time.Duration(n) * time.Second
			}
		}
	}
	maxRetries := f.maxRetries
	if maxRetries == 0 {
		maxRetries = 2
	}

	return api.New(api.Config{
		APIKey:     apiKey,
		BaseURL:    baseURL,
		Timeout:    timeout,
		MaxRetries: maxRetries,
		UserAgent:  fmt.Sprintf("apiz-cli/%s", Version),
	}), nil
}

// outputFormat picks a renderer name from --json/--yaml/--table flags.
func (f *rootFlags) outputFormat() string {
	switch {
	case f.outputYAML:
		return "yaml"
	case f.outputTable:
		return "table"
	case f.outputJSON:
		return "json"
	default:
		return "json"
	}
}

// ctx returns a context honoring the --timeout flag.
func (f *rootFlags) ctx() (context.Context, context.CancelFunc) {
	if f.timeout > 0 {
		return context.WithTimeout(context.Background(), f.timeout)
	}
	return context.WithCancel(context.Background())
}
