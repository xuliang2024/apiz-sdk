package cmd

import (
	"time"

	"github.com/spf13/cobra"

	"github.com/apiz-ai/apiz-cli/internal/api"
	"github.com/apiz-ai/apiz-cli/internal/output"
)

func newTasksCmd(flags *rootFlags) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "tasks",
		Short: "Inspect and wait on async tasks",
	}

	get := &cobra.Command{
		Use:   "get <task-id>",
		Short: "Fetch the current state of a task",
		Args:  cobra.ExactArgs(1),
		RunE: func(c *cobra.Command, args []string) error {
			ctx, cancel := flags.ctx()
			defer cancel()
			client, err := flags.resolveClient()
			if err != nil {
				return err
			}
			t, err := client.QueryTask(ctx, args[0])
			if err != nil {
				return err
			}
			return output.Render(c.OutOrStdout(), flags.outputFormat(), t, nil)
		},
	}

	var (
		waitInterval time.Duration
		waitTimeout  time.Duration
	)
	wait := &cobra.Command{
		Use:   "wait <task-id>",
		Short: "Block until the task is complete or fails",
		Args:  cobra.ExactArgs(1),
		RunE: func(c *cobra.Command, args []string) error {
			ctx, cancel := flags.ctx()
			defer cancel()
			client, err := flags.resolveClient()
			if err != nil {
				return err
			}
			t, err := client.WaitFor(ctx, args[0], api.WaitForOptions{
				PollInterval: waitInterval,
				Timeout:      waitTimeout,
			})
			if err != nil {
				return err
			}
			return output.Render(c.OutOrStdout(), flags.outputFormat(), t, nil)
		},
	}
	wait.Flags().DurationVar(&waitInterval, "interval", 5*time.Second, "Poll interval")
	wait.Flags().DurationVar(&waitTimeout, "wait-timeout", 10*time.Minute, "Total wait budget")

	cmd.AddCommand(get, wait)
	return cmd
}
