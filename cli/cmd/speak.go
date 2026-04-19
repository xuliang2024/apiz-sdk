package cmd

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/spf13/cobra"

	"github.com/apiz-ai/apiz-cli/internal/output"
)

func newSpeakCmd(flags *rootFlags) *cobra.Command {
	var (
		voiceID    string
		modelName  string
		speed      float64
		outputFile string
	)
	cmd := &cobra.Command{
		Use:   "speak <text>",
		Short: "Synthesize text to speech (Minimax TTS)",
		Args:  cobra.MinimumNArgs(1),
		RunE: func(c *cobra.Command, args []string) error {
			ctx, cancel := flags.ctx()
			defer cancel()
			client, err := flags.resolveClient()
			if err != nil {
				return err
			}
			text := strings.Join(args, " ")
			if voiceID == "" {
				voices, err := client.ListVoices(ctx, "active")
				if err != nil {
					return err
				}
				if len(voices.PublicVoices) > 0 {
					voiceID = voices.PublicVoices[0].VoiceID
				} else if len(voices.UserVoices) > 0 {
					voiceID = voices.UserVoices[0].VoiceID
				} else {
					return fmt.Errorf("no voices available; pass --voice")
				}
			}
			r, err := client.Synthesize(ctx, text, voiceID, modelName, speed)
			if err != nil {
				return err
			}
			if outputFile != "" {
				if err := downloadTo(ctx, r.AudioURL, outputFile); err != nil {
					return err
				}
				fmt.Fprintf(c.OutOrStdout(), "Saved %s (%.2fs)\n", outputFile, r.Duration)
				return nil
			}
			return output.Render(c.OutOrStdout(), flags.outputFormat(), r, nil)
		},
	}
	cmd.Flags().StringVar(&voiceID, "voice", "", "Voice id (auto-picks first public voice if omitted)")
	cmd.Flags().StringVar(&modelName, "model", "speech-2.8-hd", "speech-2.8-hd | speech-2.8-turbo | speech-2.6-hd | speech-2.6-turbo")
	cmd.Flags().Float64Var(&speed, "speed", 1.0, "Speech rate (0.5 - 2.0)")
	cmd.Flags().StringVar(&outputFile, "output-file", "", "Save audio to a local file (mp3)")

	return cmd
}

func downloadTo(ctx context.Context, audioURL, dst string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, audioURL, nil)
	if err != nil {
		return fmt.Errorf("download %s: %w", audioURL, err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("download %s: %w", audioURL, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("download %s: HTTP %d", audioURL, resp.StatusCode)
	}
	f, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, resp.Body)
	return err
}
