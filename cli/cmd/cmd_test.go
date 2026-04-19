package cmd

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testAPIKey = "sk-mock-cli-test-not-real-0000000000000000"

// runCmd builds a fresh root, points it at srv via --base-url and --api-key,
// and runs the supplied args. Returns stdout, stderr and the cobra error.
func runCmd(t *testing.T, srv *httptest.Server, args ...string) (string, string, error) {
	t.Helper()
	out := &bytes.Buffer{}
	errOut := &bytes.Buffer{}
	root := New(out, errOut)
	full := append([]string{"--api-key", testAPIKey, "--base-url", srv.URL}, args...)
	root.SetArgs(full)
	err := root.Execute()
	return out.String(), errOut.String(), err
}

func startMock(t *testing.T) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v3/balance", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"code":200,"data":{"user_id":42,"balance":12500,"balance_yuan":125.0,"vip_level":1}}`))
	})
	mux.HandleFunc("/api/v3/checkin", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"code":200,"data":{"success":true,"points_awarded":87,"balance":12587,"balance_yuan":125.87,"message":"ok"}}`))
	})
	mux.HandleFunc("/api/v3/mcp/models", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"code":200,"data":{"models":[{"id":"jimeng-4.5","name":"即梦","category":"image","capability":"t2i","pricing":{"unit":"积分","amount":8}}],"total":1}}`))
	})
	mux.HandleFunc("/api/v3/tools/parse-video", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"code":200,"data":{"platform":"douyin","video_url":"https://cdn-video.51sux.com/x.mp4"}}`))
	})
	mux.HandleFunc("/api/v3/tools/transfer-url", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"code":200,"data":{"original_url":"https://x","cdn_url":"https://cdn-video.51sux.com/y.png","type":"image"}}`))
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

func TestAccountBalance(t *testing.T) {
	srv := startMock(t)
	out, _, err := runCmd(t, srv, "account", "balance")
	require.NoError(t, err)
	assert.Contains(t, out, `"balance": 12500`)
	assert.Contains(t, out, `"user_id": 42`)
}

func TestAccountBalanceTable(t *testing.T) {
	srv := startMock(t)
	out, _, err := runCmd(t, srv, "--table", "account", "balance")
	require.NoError(t, err)
	assert.Contains(t, out, "USER")
	assert.Contains(t, out, "BALANCE")
	assert.Contains(t, out, "42")
}

func TestAccountBalanceYAML(t *testing.T) {
	srv := startMock(t)
	out, _, err := runCmd(t, srv, "--yaml", "account", "balance")
	require.NoError(t, err)
	assert.True(t, strings.Contains(out, "balance:") || strings.Contains(out, "balance: 12500"))
}

func TestAccountCheckin(t *testing.T) {
	srv := startMock(t)
	out, _, err := runCmd(t, srv, "account", "checkin")
	require.NoError(t, err)
	assert.Contains(t, out, `"success": true`)
	assert.Contains(t, out, `"points_awarded": 87`)
}

func TestModelsList(t *testing.T) {
	srv := startMock(t)
	out, _, err := runCmd(t, srv, "models", "list", "--category", "image")
	require.NoError(t, err)
	assert.Contains(t, out, "jimeng-4.5")
}

func TestParseFreeTool(t *testing.T) {
	srv := startMock(t)
	out, _, err := runCmd(t, srv, "parse", "https://v.douyin.com/example")
	require.NoError(t, err)
	assert.Contains(t, out, "douyin")
	assert.Contains(t, out, "cdn-video.51sux.com")
}

func TestTransferFreeTool(t *testing.T) {
	srv := startMock(t)
	out, _, err := runCmd(t, srv, "transfer", "https://x", "--type", "image")
	require.NoError(t, err)
	assert.Contains(t, out, "cdn-video.51sux.com")
}

func TestUnknownCommandFailsCleanly(t *testing.T) {
	srv := startMock(t)
	_, errOut, err := runCmd(t, srv, "frobnicate")
	require.Error(t, err)
	assert.Contains(t, strings.ToLower(errOut), "unknown command")
}
