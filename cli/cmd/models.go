package cmd

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/apiz-ai/apiz-cli/internal/output"
)

func newModelsCmd(flags *rootFlags) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "models",
		Short: "Browse the apiz model catalogue",
	}

	var listCategory string
	list := &cobra.Command{
		Use:   "list",
		Short: "List models, optionally filtered by category",
		RunE: func(c *cobra.Command, _ []string) error {
			ctx, cancel := flags.ctx()
			defer cancel()
			client, err := flags.resolveClient()
			if err != nil {
				return err
			}
			ms, err := client.ListModels(ctx, listCategory)
			if err != nil {
				return err
			}
			return output.Render(c.OutOrStdout(), flags.outputFormat(), ms, func() ([]string, [][]string) {
				rows := make([][]string, 0, len(ms))
				for _, m := range ms {
					price := ""
					if m.Pricing != nil {
						price = fmt.Sprintf("%.0f %s", m.Pricing.Amount, m.Pricing.Unit)
					}
					hot := ""
					if m.IsHot {
						hot = "HOT"
					}
					rows = append(rows, []string{m.ID, m.Name, m.Category, m.Capability, price, hot})
				}
				return []string{"ID", "NAME", "CAT", "CAP", "PRICE", ""}, rows
			})
		},
	}
	list.Flags().StringVar(&listCategory, "category", "", "image | video | audio")

	var infoLang string
	info := &cobra.Command{
		Use:   "info <model-id>",
		Short: "Show full schema and metadata for one model",
		Args:  cobra.ExactArgs(1),
		RunE: func(c *cobra.Command, args []string) error {
			ctx, cancel := flags.ctx()
			defer cancel()
			client, err := flags.resolveClient()
			if err != nil {
				return err
			}
			d, err := client.GetModel(ctx, args[0], infoLang)
			if err != nil {
				return err
			}
			return output.Render(c.OutOrStdout(), flags.outputFormat(), d, nil)
		},
	}
	info.Flags().StringVar(&infoLang, "lang", "zh", "zh | en | ja")

	var docsLang string
	docs := &cobra.Command{
		Use:   "docs <model-id>",
		Short: "Show the human-readable tutorial for one model",
		Args:  cobra.ExactArgs(1),
		RunE: func(c *cobra.Command, args []string) error {
			ctx, cancel := flags.ctx()
			defer cancel()
			client, err := flags.resolveClient()
			if err != nil {
				return err
			}
			d, err := client.GetModelDocs(ctx, args[0], docsLang)
			if err != nil {
				return err
			}
			fmt.Fprintln(c.OutOrStdout(), d.Tutorial)
			return nil
		},
	}
	docs.Flags().StringVar(&docsLang, "lang", "zh", "zh | en | ja")

	cmd.AddCommand(list, info, docs)
	return cmd
}
