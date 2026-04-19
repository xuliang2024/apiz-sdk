package cmd

import (
	"strings"

	"github.com/spf13/cobra"

	"github.com/apiz-ai/apiz-cli/internal/output"
)

func newVoicesCmd(flags *rootFlags) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "voices",
		Short: "List public + user voices for the configured account",
	}

	var status string
	list := &cobra.Command{
		Use:   "list",
		Short: "List voices",
		RunE: func(c *cobra.Command, _ []string) error {
			ctx, cancel := flags.ctx()
			defer cancel()
			client, err := flags.resolveClient()
			if err != nil {
				return err
			}
			r, err := client.ListVoices(ctx, status)
			if err != nil {
				return err
			}
			return output.Render(c.OutOrStdout(), flags.outputFormat(), r, func() ([]string, [][]string) {
				rows := make([][]string, 0, len(r.PublicVoices)+len(r.UserVoices))
				for _, v := range r.PublicVoices {
					rows = append(rows, []string{v.VoiceID, v.VoiceName, "public", strings.Join(v.Tags, ",")})
				}
				for _, v := range r.UserVoices {
					rows = append(rows, []string{v.VoiceID, v.VoiceName, "user", strings.Join(v.Tags, ",")})
				}
				return []string{"VOICE_ID", "NAME", "TYPE", "TAGS"}, rows
			})
		},
	}
	list.Flags().StringVar(&status, "status", "active", "active | expired | all (user voices)")

	cmd.AddCommand(list)
	return cmd
}
