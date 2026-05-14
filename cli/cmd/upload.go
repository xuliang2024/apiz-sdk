package cmd

import (
	"fmt"
	"mime"
	"net/http"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"

	"github.com/apiz-ai/apiz-cli/internal/api"
	"github.com/apiz-ai/apiz-cli/internal/output"
)

func newUploadCmd(flags *rootFlags) *cobra.Command {
	var folder string
	var contentType string
	var remark string
	var uploader string

	cmd := &cobra.Command{
		Use:   "upload <local-file>",
		Short: "Upload a local file to apiz TOS/CDN storage",
		Args:  cobra.ExactArgs(1),
		RunE: func(c *cobra.Command, args []string) error {
			path := args[0]
			info, err := os.Stat(path)
			if err != nil {
				return fmt.Errorf("read file metadata: %w", err)
			}
			if info.IsDir() {
				return fmt.Errorf("upload target is a directory: %s", path)
			}

			data, err := os.ReadFile(path)
			if err != nil {
				return fmt.Errorf("read file: %w", err)
			}
			resolvedContentType := contentType
			if resolvedContentType == "" {
				resolvedContentType = detectContentType(path, data)
			}

			ctx, cancel := flags.ctx()
			defer cancel()
			client, err := flags.resolveClient()
			if err != nil {
				return err
			}

			r, err := client.UploadStorageFile(ctx, api.StorageUploadParams{
				FileName:    filepath.Base(path),
				ContentType: resolvedContentType,
				Folder:      folder,
				FileSize:    info.Size(),
				Body:        data,
				Uploader:    uploader,
				Remark:      remark,
			})
			if err != nil {
				return err
			}
			return output.Render(c.OutOrStdout(), flags.outputFormat(), r, func() ([]string, [][]string) {
				return []string{"URL", "FILE", "SIZE", "TYPE"},
					[][]string{{
						r.PublicURL,
						r.FileName,
						fmt.Sprintf("%d", r.FileSize),
						r.ContentType,
					}}
			})
		},
	}
	cmd.Flags().StringVar(&folder, "folder", "cli-uploads", "Storage folder prefix")
	cmd.Flags().StringVar(&contentType, "content-type", "", "MIME type override")
	cmd.Flags().StringVar(&remark, "remark", "", "Optional upload remark")
	cmd.Flags().StringVar(&uploader, "uploader", "", "Optional uploader label")
	return cmd
}

func detectContentType(path string, data []byte) string {
	if ext := filepath.Ext(path); ext != "" {
		if ct := mime.TypeByExtension(ext); ct != "" {
			return ct
		}
	}
	if len(data) > 0 {
		limit := len(data)
		if limit > 512 {
			limit = 512
		}
		return http.DetectContentType(data[:limit])
	}
	return "application/octet-stream"
}
