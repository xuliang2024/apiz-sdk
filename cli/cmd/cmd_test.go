package cmd

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
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
	var baseURL string
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
	mux.HandleFunc("/api/storage/get-upload-url", func(w http.ResponseWriter, r *http.Request) {
		var body map[string]interface{}
		_ = json.NewDecoder(r.Body).Decode(&body)
		assert.Equal(t, "sutui_storage_2024", body["access_key"])
		assert.Equal(t, "cli-uploads", body["folder"])
		assert.Equal(t, "text/plain; charset=utf-8", body["content_type"])
		_, _ = w.Write([]byte(`{"code":200,"msg":"成功","data":{"upload_url":"` + baseURL + `/tos/object","public_url":"https://cdn-ali-hk.51sux.com/storage/cli-uploads/test.txt","file_key":"storage/cli-uploads/test.txt","method":"PUT","content_type":"text/plain; charset=utf-8"}}`))
	})
	mux.HandleFunc("/tos/object", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPut, r.Method)
		assert.Equal(t, "text/plain; charset=utf-8", r.Header.Get("Content-Type"))
		data, _ := io.ReadAll(r.Body)
		assert.Equal(t, "hello upload", string(data))
		w.WriteHeader(http.StatusOK)
	})
	mux.HandleFunc("/api/storage/confirm-upload", func(w http.ResponseWriter, r *http.Request) {
		var body map[string]interface{}
		_ = json.NewDecoder(r.Body).Decode(&body)
		assert.Equal(t, "storage/cli-uploads/test.txt", body["file_key"])
		assert.Equal(t, "https://cdn-ali-hk.51sux.com/storage/cli-uploads/test.txt", body["public_url"])
		assert.Equal(t, float64(12), body["file_size"])
		assert.Equal(t, "sutui_storage_2024", body["access_key"])
		_, _ = w.Write([]byte(`{"code":200,"msg":"成功","data":{"id":7,"public_url":"https://cdn-ali-hk.51sux.com/storage/cli-uploads/test.txt","file_name":"test.txt"}}`))
	})
	srv := httptest.NewServer(mux)
	baseURL = srv.URL
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

func TestUploadLocalFile(t *testing.T) {
	srv := startMock(t)
	dir := t.TempDir()
	path := filepath.Join(dir, "test.txt")
	require.NoError(t, os.WriteFile(path, []byte("hello upload"), 0o600))

	out, _, err := runCmd(t, srv, "upload", path)
	require.NoError(t, err)
	assert.Contains(t, out, "cdn-ali-hk.51sux.com")
	assert.Contains(t, out, `"file_key": "storage/cli-uploads/test.txt"`)
	assert.Contains(t, out, `"file_size": 12`)
}

func TestUploadMissingFileFails(t *testing.T) {
	srv := startMock(t)
	_, _, err := runCmd(t, srv, "upload", filepath.Join(t.TempDir(), "missing.png"))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "read file metadata")
}

func TestUnknownCommandFailsCleanly(t *testing.T) {
	srv := startMock(t)
	_, errOut, err := runCmd(t, srv, "frobnicate")
	require.Error(t, err)
	assert.Contains(t, strings.ToLower(errOut), "unknown command")
}
