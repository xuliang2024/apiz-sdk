package cmd

import (
	"github.com/spf13/cobra"

	"github.com/apiz-ai/apiz-cli/internal/output"
)

func newParseCmd(flags *rootFlags) *cobra.Command {
	return &cobra.Command{
		Use:   "parse <share-url>",
		Short: "Resolve a public video share link to a no-watermark URL (free)",
		Args:  cobra.ExactArgs(1),
		RunE: func(c *cobra.Command, args []string) error {
			ctx, cancel := flags.ctx()
			defer cancel()
			client, err := flags.resolveClient()
			if err != nil {
				return err
			}
			r, err := client.ParseVideo(ctx, args[0])
			if err != nil {
				return err
			}
			return output.Render(c.OutOrStdout(), flags.outputFormat(), r, nil)
		},
	}
}
