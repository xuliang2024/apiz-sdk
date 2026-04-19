package cmd

import (
	"github.com/spf13/cobra"

	"github.com/apiz-ai/apiz-cli/internal/output"
)

func newTransferCmd(flags *rootFlags) *cobra.Command {
	var mediaType string
	cmd := &cobra.Command{
		Use:   "transfer <external-url>",
		Short: "Mirror an external image / audio URL into the apiz CDN (free)",
		Args:  cobra.ExactArgs(1),
		RunE: func(c *cobra.Command, args []string) error {
			ctx, cancel := flags.ctx()
			defer cancel()
			client, err := flags.resolveClient()
			if err != nil {
				return err
			}
			r, err := client.TransferURL(ctx, args[0], mediaType)
			if err != nil {
				return err
			}
			return output.Render(c.OutOrStdout(), flags.outputFormat(), r, nil)
		},
	}
	cmd.Flags().StringVar(&mediaType, "type", "image", "image | audio")
	return cmd
}
