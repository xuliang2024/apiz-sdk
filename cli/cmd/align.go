package cmd

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/apiz-ai/apiz-cli/internal/api"
	"github.com/apiz-ai/apiz-cli/internal/output"
)

func newAlignCmd(flags *rootFlags) *cobra.Command {
	var (
		audioURL     string
		mode         string
		staPuncMode  int
		outputFile   string
		pollInterval time.Duration
		waitTimeout  time.Duration
	)
	cmd := &cobra.Command{
		Use:   "align <audio-text>",
		Short: "Forced alignment: input audio + known text, get word-level timestamps",
		Long: `Align spoken or sung audio against the provided subtitle / lyric text and
return per-word millisecond timestamps. Use --mode singing for songs.

Example:
  apiz align "如果您没有其他需要举报的话..." \
    --audio https://example.com/talk.mp3 \
    --mode speech`,
		Args: cobra.MinimumNArgs(1),
		RunE: func(c *cobra.Command, args []string) error {
			if audioURL == "" {
				return fmt.Errorf("--audio is required")
			}
			ctx, cancel := buildAlignCtx(flags, waitTimeout)
			defer cancel()
			client, err := flags.resolveClient()
			if err != nil {
				return err
			}

			text := strings.Join(args, " ")
			r, err := client.Align(ctx, api.AlignParams{
				AudioURL:    audioURL,
				AudioText:   text,
				Mode:        mode,
				StaPuncMode: staPuncMode,
			}, api.WaitForOptions{
				PollInterval: pollInterval,
				Timeout:      waitTimeout,
			})
			if err != nil {
				return err
			}

			if outputFile != "" {
				buf, err := json.MarshalIndent(r, "", "  ")
				if err != nil {
					return err
				}
				if err := os.WriteFile(outputFile, buf, 0o644); err != nil {
					return err
				}
				fmt.Fprintf(c.OutOrStdout(), "Saved %s (%d utterances, %.2fs)\n",
					outputFile, len(r.Utterances), r.Duration)
				return nil
			}

			return output.Render(c.OutOrStdout(), flags.outputFormat(), r, nil)
		},
	}

	cmd.Flags().StringVar(&audioURL, "audio", "", "Audio URL (mp3/wav/m4a, max 120 minutes) (required)")
	cmd.Flags().StringVar(&mode, "mode", "speech", "Alignment mode: speech or singing")
	cmd.Flags().IntVar(&staPuncMode, "punct-mode", 0, "Punctuation mode: 1 (default), 2 or 3")
	cmd.Flags().StringVar(&outputFile, "output-file", "", "Write the structured result as JSON to this path")
	cmd.Flags().DurationVar(&pollInterval, "interval", 2*time.Second, "Poll interval while waiting")
	cmd.Flags().DurationVar(&waitTimeout, "wait-timeout", 5*time.Minute, "Total wait budget")

	return cmd
}

// buildAlignCtx prefers the larger of --timeout (root) and --wait-timeout so
// the long-running align poll doesn't get killed by the per-request budget.
func buildAlignCtx(flags *rootFlags, waitTimeout time.Duration) (context.Context, context.CancelFunc) {
	if flags.timeout > 0 && flags.timeout > waitTimeout {
		return context.WithTimeout(context.Background(), flags.timeout)
	}
	if waitTimeout > 0 {
		return context.WithTimeout(context.Background(), waitTimeout+30*time.Second)
	}
	return context.WithCancel(context.Background())
}
