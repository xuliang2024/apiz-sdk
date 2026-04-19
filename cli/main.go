// Package main is the entry point for the apiz CLI.
package main

import (
	"os"

	"github.com/apiz-ai/apiz-cli/cmd"
)

func main() {
	os.Exit(cmd.Execute())
}
