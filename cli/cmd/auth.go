package cmd

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"

	"github.com/apiz-ai/apiz-cli/internal/config"
)

func newAuthCmd(_ *rootFlags) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "auth",
		Short: "Manage saved profiles (api keys) for the apiz CLI",
	}

	var loginProfile string
	var loginKey string
	var loginBaseURL string
	login := &cobra.Command{
		Use:   "login",
		Short: "Save an API key into ~/.config/apiz/config.toml",
		RunE: func(c *cobra.Command, _ []string) error {
			out := c.OutOrStdout()
			in := c.InOrStdin()
			file, err := config.Load("")
			if err != nil {
				return err
			}
			if loginProfile == "" {
				loginProfile = "default"
			}
			if loginKey == "" {
				fmt.Fprint(out, "API Key (get one at https://www.xskill.ai/#/v2/api-keys): ")
				reader := bufio.NewReader(in)
				line, err := reader.ReadString('\n')
				if err != nil {
					return fmt.Errorf("read input: %w", err)
				}
				loginKey = strings.TrimSpace(line)
			}
			if loginKey == "" {
				return fmt.Errorf("no API key provided")
			}
			file.SetProfile(loginProfile, config.Profile{APIKey: loginKey, BaseURL: loginBaseURL})
			if err := config.Save("", file); err != nil {
				return err
			}
			path, _ := config.DefaultPath()
			fmt.Fprintf(out, "Saved profile %q to %s\n", loginProfile, path)
			return nil
		},
	}
	login.Flags().StringVar(&loginProfile, "profile", "default", "Profile name")
	login.Flags().StringVar(&loginKey, "api-key", "", "API key (avoid passing on the command line; will prompt if omitted)")
	login.Flags().StringVar(&loginBaseURL, "base-url", "", "Optional backend URL override")

	status := &cobra.Command{
		Use:   "status",
		Short: "Show which profile is active and where the config lives",
		RunE: func(c *cobra.Command, _ []string) error {
			out := c.OutOrStdout()
			file, err := config.Load("")
			if err != nil {
				return err
			}
			path, _ := config.DefaultPath()
			fmt.Fprintf(out, "Config: %s\n", path)
			if len(file.Profiles) == 0 {
				fmt.Fprintln(out, "No profiles configured. Run `apiz auth login` to add one.")
				return nil
			}
			fmt.Fprintf(out, "Default profile: %s\n", file.DefaultProfile)
			fmt.Fprintln(out, "Profiles:")
			for name, p := range file.Profiles {
				masked := maskKey(p.APIKey)
				baseURL := p.BaseURL
				if baseURL == "" {
					baseURL = "https://api.apiz.ai"
				}
				fmt.Fprintf(out, "  %s  api_key=%s  base_url=%s\n", name, masked, baseURL)
			}
			return nil
		},
	}

	var logoutProfile string
	logout := &cobra.Command{
		Use:   "logout",
		Short: "Remove a profile from the config file",
		RunE: func(c *cobra.Command, _ []string) error {
			out := c.OutOrStdout()
			file, err := config.Load("")
			if err != nil {
				return err
			}
			if logoutProfile == "" {
				logoutProfile = "default"
			}
			if _, ok := file.Profiles[logoutProfile]; !ok {
				return fmt.Errorf("profile %q not found", logoutProfile)
			}
			delete(file.Profiles, logoutProfile)
			if file.DefaultProfile == logoutProfile {
				file.DefaultProfile = ""
				for n := range file.Profiles {
					file.DefaultProfile = n
					break
				}
			}
			if err := config.Save("", file); err != nil {
				return err
			}
			fmt.Fprintf(out, "Removed profile %q\n", logoutProfile)
			return nil
		},
	}
	logout.Flags().StringVar(&logoutProfile, "profile", "default", "Profile to remove")

	cmd.AddCommand(login, status, logout)
	return cmd
}

func maskKey(key string) string {
	if len(key) <= 7 {
		return "***"
	}
	return key[:4] + "***" + key[len(key)-3:]
}

// keep the os import non-removed even if Read tools aren't used directly.
var _ = os.Getuid
