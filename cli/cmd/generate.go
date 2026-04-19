package cmd

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/apiz-ai/apiz-cli/internal/api"
	"github.com/apiz-ai/apiz-cli/internal/output"
)

func newGenerateCmd(flags *rootFlags) *cobra.Command {
	var (
		model       string
		imageURL    string
		imageSize   string
		aspectRatio string
		duration    string
		paramsJSON  string
		wait        bool
		interval    time.Duration
		waitTimeout time.Duration
	)
	cmd := &cobra.Command{
		Use:   "generate <prompt>",
		Short: "Submit a generation job (and optionally wait for completion)",
		Args:  cobra.MinimumNArgs(1),
		RunE: func(c *cobra.Command, args []string) error {
			if model == "" {
				return fmt.Errorf("--model is required")
			}
			ctx, cancel := flags.ctx()
			defer cancel()
			client, err := flags.resolveClient()
			if err != nil {
				return err
			}
			prompt := strings.Join(args, " ")
			params := map[string]interface{}{"prompt": prompt}
			if imageURL != "" {
				params["image_url"] = imageURL
			}
			if imageSize != "" {
				params["image_size"] = imageSize
			}
			if aspectRatio != "" {
				params["aspect_ratio"] = aspectRatio
			}
			if duration != "" {
				params["duration"] = duration
			}
			if paramsJSON != "" {
				extra := map[string]interface{}{}
				if err := json.Unmarshal([]byte(paramsJSON), &extra); err != nil {
					return fmt.Errorf("invalid --params JSON: %w", err)
				}
				for k, v := range extra {
					params[k] = v
				}
			}

			task, err := client.CreateTask(ctx, model, params)
			if err != nil {
				return err
			}
			if !wait || task.Status == "completed" {
				return output.Render(c.OutOrStdout(), flags.outputFormat(), task, nil)
			}
			final, err := client.WaitFor(ctx, task.TaskID, api.WaitForOptions{
				PollInterval: interval,
				Timeout:      waitTimeout,
			})
			if err != nil {
				return err
			}
			return output.Render(c.OutOrStdout(), flags.outputFormat(), final, nil)
		},
	}

	cmd.Flags().StringVar(&model, "model", "", "Model id (use `apiz models list` to discover)")
	cmd.Flags().StringVar(&imageURL, "image-url", "", "Input image URL (image-to-image / image-to-video)")
	cmd.Flags().StringVar(&imageSize, "image-size", "", "square_hd | landscape_16_9 | portrait_4_3 …")
	cmd.Flags().StringVar(&aspectRatio, "aspect-ratio", "", "16:9 | 9:16 | 1:1 …")
	cmd.Flags().StringVar(&duration, "duration", "", "Video duration (seconds)")
	cmd.Flags().StringVar(&paramsJSON, "params", "", "Extra params as a JSON object, merged into the request")
	cmd.Flags().BoolVar(&wait, "wait", false, "Block until the task reaches a terminal state")
	cmd.Flags().DurationVar(&interval, "interval", 5*time.Second, "Poll interval (with --wait)")
	cmd.Flags().DurationVar(&waitTimeout, "wait-timeout", 10*time.Minute, "Wait budget (with --wait)")

	return cmd
}
