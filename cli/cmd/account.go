package cmd

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/apiz-ai/apiz-cli/internal/output"
)

func newAccountCmd(flags *rootFlags) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "account",
		Short: "Account management (balance, daily check-in)",
	}

	balance := &cobra.Command{
		Use:   "balance",
		Short: "Show current points balance and yuan equivalent",
		RunE: func(c *cobra.Command, _ []string) error {
			ctx, cancel := flags.ctx()
			defer cancel()
			client, err := flags.resolveClient()
			if err != nil {
				return err
			}
			b, err := client.Balance(ctx)
			if err != nil {
				return err
			}
			return output.Render(c.OutOrStdout(), flags.outputFormat(), b, func() ([]string, [][]string) {
				return []string{"USER", "BALANCE", "YUAN", "VIP"},
					[][]string{{
						fmt.Sprintf("%d", b.UserID),
						fmt.Sprintf("%.2f", b.Balance),
						fmt.Sprintf("%.2f", b.BalanceYuan),
						fmt.Sprintf("%d", b.VipLevel),
					}}
			})
		},
	}

	checkin := &cobra.Command{
		Use:   "checkin",
		Short: "Claim daily points (random 50-150). Idempotent per day",
		RunE: func(c *cobra.Command, _ []string) error {
			ctx, cancel := flags.ctx()
			defer cancel()
			client, err := flags.resolveClient()
			if err != nil {
				return err
			}
			r, err := client.Checkin(ctx)
			if err != nil {
				return err
			}
			return output.Render(c.OutOrStdout(), flags.outputFormat(), r, func() ([]string, [][]string) {
				return []string{"SUCCESS", "AWARDED", "BALANCE", "MESSAGE"},
					[][]string{{
						fmt.Sprintf("%v", r.Success),
						fmt.Sprintf("%.0f", r.PointsAwarded),
						fmt.Sprintf("%.0f", r.Balance),
						r.Message,
					}}
			})
		},
	}

	cmd.AddCommand(balance, checkin)
	return cmd
}
