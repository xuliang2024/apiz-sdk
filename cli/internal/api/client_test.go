package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testAPIKey = "sk-mock-test-not-real-0000000000000000000000"

func newMockClient(t *testing.T, handler http.Handler) (*Client, *httptest.Server) {
	t.Helper()
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)
	c := New(Config{APIKey: testAPIKey, BaseURL: srv.URL, MaxRetries: 0, Timeout: 5 * time.Second})
	return c, srv
}

func TestBalanceHappyPath(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v3/balance", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "Bearer "+testAPIKey, r.Header.Get("Authorization"))
		assert.Equal(t, "GET", r.Method)
		_, _ = w.Write([]byte(`{"code":200,"data":{"user_id":42,"balance":100,"balance_yuan":1.0,"vip_level":1}}`))
	})
	c, _ := newMockClient(t, mux)

	b, err := c.Balance(context.Background())
	require.NoError(t, err)
	assert.Equal(t, int64(42), b.UserID)
	assert.Equal(t, 100.0, b.Balance)
}

func TestCheckinHappyPath(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v3/checkin", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"code":200,"data":{"success":true,"points_awarded":87,"balance":187,"message":"ok"}}`))
	})
	c, _ := newMockClient(t, mux)
	r, err := c.Checkin(context.Background())
	require.NoError(t, err)
	assert.True(t, r.Success)
	assert.Equal(t, 87.0, r.PointsAwarded)
}

func TestCreateAndQueryTask(t *testing.T) {
	var captured map[string]interface{}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v3/tasks/create", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&captured)
		_, _ = w.Write([]byte(`{"code":200,"data":{"task_id":"t1","status":"pending","model":"x"}}`))
	})
	mux.HandleFunc("/api/v3/tasks/query", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"code":200,"data":{"task_id":"t1","status":"completed","model":"x"}}`))
	})
	c, _ := newMockClient(t, mux)

	task, err := c.CreateTask(context.Background(), "wan/v2.6/image-to-video", map[string]interface{}{"prompt": "x"})
	require.NoError(t, err)
	assert.Equal(t, "t1", task.TaskID)
	assert.Equal(t, "wan/v2.6/image-to-video", captured["model"])

	status, err := c.QueryTask(context.Background(), "t1")
	require.NoError(t, err)
	assert.Equal(t, "completed", status.Status)
}

func TestListModelsHonorsFilter(t *testing.T) {
	var capturedQS string
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v3/mcp/models", func(w http.ResponseWriter, r *http.Request) {
		capturedQS = r.URL.RawQuery
		_, _ = w.Write([]byte(`{"code":200,"data":{"models":[{"id":"m1","name":"M1","category":"image"}],"total":1}}`))
	})
	c, _ := newMockClient(t, mux)

	models, err := c.ListModels(context.Background(), "image")
	require.NoError(t, err)
	assert.Len(t, models, 1)
	assert.Contains(t, capturedQS, "category=image")
}

func TestGetModelEncodesPathSlash(t *testing.T) {
	var capturedPath string
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v3/mcp/models/", func(w http.ResponseWriter, r *http.Request) {
		capturedPath = r.URL.Path
		_, _ = w.Write([]byte(`{"code":200,"data":{"id":"fal-ai/flux-2/flash","name":"Flux 2 Flash","category":"image"}}`))
	})
	c, _ := newMockClient(t, mux)

	d, err := c.GetModel(context.Background(), "fal-ai/flux-2/flash", "en")
	require.NoError(t, err)
	assert.Equal(t, "fal-ai/flux-2/flash", d.ID)
	assert.Equal(t, "/api/v3/mcp/models/fal-ai/flux-2/flash", capturedPath)
}

func TestParseVideoOmitsAuth(t *testing.T) {
	var capturedAuth string
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v3/tools/parse-video", func(w http.ResponseWriter, r *http.Request) {
		capturedAuth = r.Header.Get("Authorization")
		_, _ = w.Write([]byte(`{"code":200,"data":{"platform":"douyin","video_url":"https://cdn-video.51sux.com/x.mp4"}}`))
	})
	c, _ := newMockClient(t, mux)

	r, err := c.ParseVideo(context.Background(), "https://v.douyin.com/x")
	require.NoError(t, err)
	assert.Equal(t, "douyin", r.Platform)
	assert.Empty(t, capturedAuth, "parseVideo should not send Authorization header (free tool)")
}

func TestErrorMapping(t *testing.T) {
	tests := []struct {
		name   string
		status int
		body   string
		kind   ErrorKind
	}{
		{"401", http.StatusUnauthorized, `{"code":401,"detail":"nope"}`, ErrAuthentication},
		{"402", http.StatusPaymentRequired, `{"code":402,"detail":"poor"}`, ErrInsufficientBalance},
		{"404", http.StatusNotFound, `{"code":404,"detail":"missing"}`, ErrNotFound},
		{"422", http.StatusUnprocessableEntity, `{"code":422,"detail":"bad"}`, ErrValidation},
		{"429", http.StatusTooManyRequests, `{"code":429,"detail":"slow"}`, ErrRateLimit},
		{"500", http.StatusInternalServerError, `{"code":500,"detail":"oops"}`, ErrServer},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			mux := http.NewServeMux()
			mux.HandleFunc("/api/v3/balance", func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(tc.status)
				_, _ = w.Write([]byte(tc.body))
			})
			c, _ := newMockClient(t, mux)
			_, err := c.Balance(context.Background())
			require.Error(t, err)
			var apiErr *APIError
			require.True(t, errors.As(err, &apiErr))
			assert.Equal(t, tc.kind, apiErr.Kind)
			assert.Equal(t, tc.status, apiErr.Status)
		})
	}
}

func TestRetryOn5xxThenSucceed(t *testing.T) {
	var calls int
	var mu sync.Mutex
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v3/balance", func(w http.ResponseWriter, _ *http.Request) {
		mu.Lock()
		calls++
		c := calls
		mu.Unlock()
		if c < 2 {
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(`{"code":500,"detail":"transient"}`))
			return
		}
		_, _ = w.Write([]byte(`{"code":200,"data":{"user_id":1,"balance":50,"balance_yuan":0.5,"vip_level":0}}`))
	})

	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	c := New(Config{APIKey: testAPIKey, BaseURL: srv.URL, MaxRetries: 3, Timeout: 5 * time.Second})

	b, err := c.Balance(context.Background())
	require.NoError(t, err)
	assert.Equal(t, 50.0, b.Balance)
	assert.GreaterOrEqual(t, calls, 2)
}

func TestNoRetryOn4xx(t *testing.T) {
	var calls int
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v3/balance", func(w http.ResponseWriter, _ *http.Request) {
		calls++
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"code":401,"detail":"nope"}`))
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	c := New(Config{APIKey: testAPIKey, BaseURL: srv.URL, MaxRetries: 5})

	_, err := c.Balance(context.Background())
	require.Error(t, err)
	assert.Equal(t, 1, calls)
}

func TestUserAgentSet(t *testing.T) {
	var ua string
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v3/balance", func(w http.ResponseWriter, r *http.Request) {
		ua = r.Header.Get("User-Agent")
		_, _ = w.Write([]byte(`{"code":200,"data":{"user_id":1,"balance":1,"balance_yuan":0,"vip_level":0}}`))
	})
	c, _ := newMockClient(t, mux)
	_, _ = c.Balance(context.Background())
	assert.True(t, strings.HasPrefix(ua, "apiz-cli/"))
}
