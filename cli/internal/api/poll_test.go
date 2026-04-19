package api

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWaitForPollsUntilCompleted(t *testing.T) {
	var calls int32
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v3/tasks/query", func(w http.ResponseWriter, _ *http.Request) {
		n := atomic.AddInt32(&calls, 1)
		switch {
		case n == 1:
			_, _ = w.Write([]byte(`{"code":200,"data":{"task_id":"t1","status":"pending"}}`))
		case n == 2:
			_, _ = w.Write([]byte(`{"code":200,"data":{"task_id":"t1","status":"processing"}}`))
		default:
			_, _ = w.Write([]byte(`{"code":200,"data":{"task_id":"t1","status":"completed"}}`))
		}
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	c := New(Config{APIKey: testAPIKey, BaseURL: srv.URL})

	res, err := c.WaitFor(context.Background(), "t1", WaitForOptions{PollInterval: time.Millisecond})
	require.NoError(t, err)
	assert.Equal(t, "completed", res.Status)
	assert.GreaterOrEqual(t, atomic.LoadInt32(&calls), int32(2))
}

func TestWaitForFailsOnFailedStatus(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v3/tasks/query", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"code":200,"data":{"task_id":"t1","status":"failed","error":"upstream"}}`))
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	c := New(Config{APIKey: testAPIKey, BaseURL: srv.URL})

	_, err := c.WaitFor(context.Background(), "t1", WaitForOptions{PollInterval: time.Millisecond})
	require.Error(t, err)
	var apiErr *APIError
	require.True(t, errors.As(err, &apiErr))
	assert.Contains(t, apiErr.Message, "upstream")
}

func TestWaitForRespectsTimeout(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v3/tasks/query", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"code":200,"data":{"task_id":"t1","status":"pending"}}`))
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	c := New(Config{APIKey: testAPIKey, BaseURL: srv.URL})

	_, err := c.WaitFor(context.Background(), "t1", WaitForOptions{
		PollInterval: 50 * time.Millisecond,
		Timeout:      5 * time.Millisecond,
	})
	require.Error(t, err)
	var apiErr *APIError
	require.True(t, errors.As(err, &apiErr))
	assert.Equal(t, ErrTimeout, apiErr.Kind)
}

func TestWaitForInvokesOnProgress(t *testing.T) {
	var calls int32
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v3/tasks/query", func(w http.ResponseWriter, _ *http.Request) {
		n := atomic.AddInt32(&calls, 1)
		if n < 3 {
			_, _ = w.Write([]byte(`{"code":200,"data":{"task_id":"t1","status":"processing"}}`))
		} else {
			_, _ = w.Write([]byte(`{"code":200,"data":{"task_id":"t1","status":"completed"}}`))
		}
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	c := New(Config{APIKey: testAPIKey, BaseURL: srv.URL})

	var observed []string
	res, err := c.WaitFor(context.Background(), "t1", WaitForOptions{
		PollInterval: time.Millisecond,
		OnProgress:   func(t *TaskResponse) { observed = append(observed, t.Status) },
	})
	require.NoError(t, err)
	assert.Equal(t, "completed", res.Status)
	assert.GreaterOrEqual(t, len(observed), 2)
	assert.Equal(t, "completed", observed[len(observed)-1])
}
