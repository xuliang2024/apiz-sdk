// Package output renders structured data as JSON, YAML or human tables.
package output

import (
	"encoding/json"
	"fmt"
	"io"

	"github.com/olekukonko/tablewriter"
	"gopkg.in/yaml.v3"
)

// Format names accepted by the CLI's --output flag.
const (
	FormatJSON  = "json"
	FormatYAML  = "yaml"
	FormatTable = "table"
)

// JSON encodes v indented and writes a trailing newline.
func JSON(w io.Writer, v interface{}) error {
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	enc.SetEscapeHTML(false)
	return enc.Encode(v)
}

// YAML encodes v as YAML.
func YAML(w io.Writer, v interface{}) error {
	enc := yaml.NewEncoder(w)
	enc.SetIndent(2)
	defer enc.Close()
	return enc.Encode(v)
}

// Table renders headers + rows. Returns the number of bytes written.
func Table(w io.Writer, headers []string, rows [][]string) {
	t := tablewriter.NewWriter(w)
	t.SetHeader(headers)
	t.SetBorder(false)
	t.SetHeaderAlignment(tablewriter.ALIGN_LEFT)
	t.SetAlignment(tablewriter.ALIGN_LEFT)
	t.SetAutoWrapText(false)
	t.AppendBulk(rows)
	t.Render()
}

// Render is a convenience: pick a renderer by name.
func Render(w io.Writer, format string, v interface{}, table func() (headers []string, rows [][]string)) error {
	switch format {
	case FormatJSON, "":
		return JSON(w, v)
	case FormatYAML:
		return YAML(w, v)
	case FormatTable:
		if table == nil {
			return JSON(w, v)
		}
		headers, rows := table()
		Table(w, headers, rows)
		return nil
	default:
		return fmt.Errorf("unsupported output format %q (use json | yaml | table)", format)
	}
}
