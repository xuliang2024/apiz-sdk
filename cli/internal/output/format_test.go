package output

import (
	"bytes"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJSONIndentsAndAddsNewline(t *testing.T) {
	var buf bytes.Buffer
	require.NoError(t, JSON(&buf, map[string]int{"a": 1}))
	out := buf.String()
	assert.Contains(t, out, "\n")
	assert.Contains(t, out, `  "a": 1`)
}

func TestYAMLEncodes(t *testing.T) {
	var buf bytes.Buffer
	require.NoError(t, YAML(&buf, map[string]string{"key": "value"}))
	assert.Contains(t, buf.String(), "key: value")
}

func TestTableRenders(t *testing.T) {
	var buf bytes.Buffer
	Table(&buf, []string{"A", "B"}, [][]string{{"1", "2"}, {"3", "4"}})
	out := buf.String()
	assert.Contains(t, out, "A")
	assert.Contains(t, out, "1")
	assert.Contains(t, out, "3")
}

func TestRenderUnknownFormat(t *testing.T) {
	var buf bytes.Buffer
	err := Render(&buf, "zzz", nil, nil)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported")
}

func TestRenderTableFallsBackToJSONWhenNoTableFunc(t *testing.T) {
	var buf bytes.Buffer
	require.NoError(t, Render(&buf, "table", map[string]int{"x": 1}, nil))
	assert.True(t, strings.Contains(buf.String(), `"x"`))
}
