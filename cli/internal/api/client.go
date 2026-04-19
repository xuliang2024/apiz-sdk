package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// DefaultBaseURL points at the production apiz backend.
const DefaultBaseURL = "https://api.apiz.ai"

// DefaultTimeout is the per-request wall clock budget.
const DefaultTimeout = 60 * time.Second

// retryableStatuses lists HTTP codes that the client retries automatically.
var retryableStatuses = map[int]bool{
	408: true, 425: true, 429: true,
	500: true, 502: true, 503: true, 504: true,
}

// Config holds resolved client settings.
type Config struct {
	APIKey     string
	BaseURL    string
	Timeout    time.Duration
	MaxRetries int
	UserAgent  string
}

// Client is the apiz REST client used by the CLI. Safe for concurrent use.
type Client struct {
	cfg  Config
	http *http.Client
}

// New creates a Client from cfg, applying defaults for missing fields.
func New(cfg Config) *Client {
	if cfg.BaseURL == "" {
		cfg.BaseURL = DefaultBaseURL
	}
	cfg.BaseURL = strings.TrimRight(cfg.BaseURL, "/")
	if cfg.Timeout == 0 {
		cfg.Timeout = DefaultTimeout
	}
	if cfg.UserAgent == "" {
		cfg.UserAgent = "apiz-cli/0.0.0"
	}
	return &Client{
		cfg:  cfg,
		http: &http.Client{Timeout: cfg.Timeout},
	}
}

// Config exposes the resolved configuration (read-only).
func (c *Client) Config() Config {
	return c.cfg
}

// requestOptions configures one HTTP call.
type requestOptions struct {
	method string
	path   string
	query  url.Values
	body   interface{}
	auth   bool // default true
}

// do executes opts, retrying on retryable failures.
func (c *Client) do(ctx context.Context, opts requestOptions, out interface{}) error {
	endpoint := c.cfg.BaseURL + opts.path
	if len(opts.query) > 0 {
		endpoint += "?" + opts.query.Encode()
	}

	var bodyBytes []byte
	if opts.body != nil && opts.method != http.MethodGet {
		var err error
		bodyBytes, err = json.Marshal(opts.body)
		if err != nil {
			return fmt.Errorf("marshal body: %w", err)
		}
	}

	maxAttempts := c.cfg.MaxRetries + 1
	if maxAttempts < 1 {
		maxAttempts = 1
	}

	var lastErr error
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		var bodyReader io.Reader
		if bodyBytes != nil {
			bodyReader = bytes.NewReader(bodyBytes)
		}
		req, err := http.NewRequestWithContext(ctx, opts.method, endpoint, bodyReader)
		if err != nil {
			return fmt.Errorf("build request: %w", err)
		}
		req.Header.Set("Accept", "application/json")
		req.Header.Set("User-Agent", c.cfg.UserAgent)
		if bodyBytes != nil {
			req.Header.Set("Content-Type", "application/json")
		}
		if opts.auth && c.cfg.APIKey != "" {
			req.Header.Set("Authorization", "Bearer "+c.cfg.APIKey)
		}

		resp, err := c.http.Do(req)
		if err != nil {
			if isTimeout(err) {
				return &APIError{Kind: ErrTimeout, Message: err.Error()}
			}
			lastErr = &APIError{Kind: ErrConnection, Message: err.Error()}
			if attempt < maxAttempts {
				time.Sleep(backoff(attempt))
				continue
			}
			return lastErr
		}

		body, _ := io.ReadAll(resp.Body)
		_ = resp.Body.Close()

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			return decodeSuccess(body, out)
		}

		apiErr := decodeError(body, resp.StatusCode, opts.method, opts.path)
		if retryableStatuses[resp.StatusCode] && attempt < maxAttempts {
			lastErr = apiErr
			time.Sleep(backoff(attempt))
			continue
		}
		return apiErr
	}

	if lastErr != nil {
		return lastErr
	}
	return &APIError{Message: "exhausted retries"}
}

func backoff(attempt int) time.Duration {
	base := 50 * time.Millisecond
	for i := 1; i < attempt; i++ {
		base *= 2
		if base > 2*time.Second {
			base = 2 * time.Second
			break
		}
	}
	return base
}

func isTimeout(err error) bool {
	if err == nil {
		return false
	}
	type timeoutError interface{ Timeout() bool }
	var te timeoutError
	if errorsAs(err, &te) {
		return te.Timeout()
	}
	return strings.Contains(err.Error(), "timeout")
}

func errorsAs(err error, target interface{}) bool {
	if t, ok := target.(*interface{ Timeout() bool }); ok {
		// crude type assertion, sufficient for our needs.
		if cause, ok := err.(interface{ Timeout() bool }); ok {
			*t = cause
			return true
		}
	}
	return false
}

func decodeSuccess(body []byte, out interface{}) error {
	if out == nil {
		return nil
	}
	if len(body) == 0 {
		return nil
	}
	// Try the {code, data} envelope first; fall back to the raw payload.
	var env struct {
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(body, &env); err == nil && len(env.Data) > 0 {
		return json.Unmarshal(env.Data, out)
	}
	return json.Unmarshal(body, out)
}

func decodeError(body []byte, status int, method, path string) *APIError {
	var env struct {
		Code    int             `json:"code"`
		Message string          `json:"message"`
		Detail  json.RawMessage `json:"detail"`
		Data    json.RawMessage `json:"data"`
	}
	_ = json.Unmarshal(body, &env)
	msg := env.Message
	if msg == "" {
		var s string
		if err := json.Unmarshal(env.Detail, &s); err == nil {
			msg = s
		}
	}
	if msg == "" {
		msg = fmt.Sprintf("HTTP %d from %s %s", status, method, path)
	}
	var detail interface{}
	if len(env.Data) > 0 {
		_ = json.Unmarshal(env.Data, &detail)
	}
	return errorFromStatus(status, msg, env.Code, detail)
}

// ---- Resource methods ----

// Balance returns the current account balance.
func (c *Client) Balance(ctx context.Context) (*BalanceResponse, error) {
	var b BalanceResponse
	if err := c.do(ctx, requestOptions{method: http.MethodGet, path: "/api/v3/balance", auth: true}, &b); err != nil {
		return nil, err
	}
	return &b, nil
}

// Checkin attempts the daily check-in for points.
func (c *Client) Checkin(ctx context.Context) (*CheckinResponse, error) {
	var r CheckinResponse
	body := map[string]interface{}{}
	if err := c.do(ctx, requestOptions{method: http.MethodPost, path: "/api/v3/checkin", body: body, auth: true}, &r); err != nil {
		return nil, err
	}
	return &r, nil
}

// CreateTask submits a generation job.
func (c *Client) CreateTask(ctx context.Context, model string, params map[string]interface{}) (*TaskResponse, error) {
	body := map[string]interface{}{
		"model":        model,
		"params":       params,
		"channel":      nil,
		"callback_url": nil,
	}
	var t TaskResponse
	if err := c.do(ctx, requestOptions{method: http.MethodPost, path: "/api/v3/tasks/create", body: body, auth: true}, &t); err != nil {
		return nil, err
	}
	return &t, nil
}

// QueryTask polls the current state of a task.
func (c *Client) QueryTask(ctx context.Context, taskID string) (*TaskResponse, error) {
	var t TaskResponse
	body := map[string]string{"task_id": taskID}
	if err := c.do(ctx, requestOptions{method: http.MethodPost, path: "/api/v3/tasks/query", body: body, auth: true}, &t); err != nil {
		return nil, err
	}
	return &t, nil
}

// ListModels returns the catalog filtered by category.
func (c *Client) ListModels(ctx context.Context, category string) ([]ModelSummary, error) {
	q := url.Values{}
	if category != "" {
		q.Set("category", category)
	}
	var env struct {
		Models []ModelSummary `json:"models"`
		Total  int            `json:"total"`
	}
	if err := c.do(ctx, requestOptions{method: http.MethodGet, path: "/api/v3/mcp/models", query: q, auth: false}, &env); err != nil {
		return nil, err
	}
	return env.Models, nil
}

// GetModel returns the full schema and metadata for one model.
func (c *Client) GetModel(ctx context.Context, modelID, lang string) (*ModelDetail, error) {
	if lang == "" {
		lang = "zh"
	}
	q := url.Values{}
	q.Set("lang", lang)
	var d ModelDetail
	path := "/api/v3/mcp/models/" + safePathEscape(modelID)
	if err := c.do(ctx, requestOptions{method: http.MethodGet, path: path, query: q, auth: false}, &d); err != nil {
		return nil, err
	}
	return &d, nil
}

// GetModelDocs fetches the human-readable tutorial.
func (c *Client) GetModelDocs(ctx context.Context, modelID, lang string) (*ModelDocs, error) {
	if lang == "" {
		lang = "zh"
	}
	q := url.Values{}
	q.Set("lang", lang)
	var d ModelDocs
	path := "/api/v3/models/" + safePathEscape(modelID) + "/docs"
	if err := c.do(ctx, requestOptions{method: http.MethodGet, path: path, query: q, auth: false}, &d); err != nil {
		return nil, err
	}
	return &d, nil
}

// ListVoices returns user + public voices for the configured key.
func (c *Client) ListVoices(ctx context.Context, status string) (*VoiceListResponse, error) {
	if status == "" {
		status = "active"
	}
	q := url.Values{}
	q.Set("status", status)
	var r VoiceListResponse
	if err := c.do(ctx, requestOptions{method: http.MethodPost, path: "/api/v3/minimax/voices", query: q, body: map[string]interface{}{}, auth: true}, &r); err != nil {
		return nil, err
	}
	return &r, nil
}

// Synthesize converts text to speech with the chosen voice.
func (c *Client) Synthesize(ctx context.Context, text, voiceID, model string, speed float64) (*SynthesizeResponse, error) {
	if model == "" {
		model = "speech-2.8-hd"
	}
	if speed == 0 {
		speed = 1.0
	}
	body := map[string]interface{}{
		"text":     text,
		"voice_id": voiceID,
		"model":    model,
		"speed":    speed,
	}
	var r SynthesizeResponse
	if err := c.do(ctx, requestOptions{method: http.MethodPost, path: "/api/v3/minimax/t2a", body: body, auth: true}, &r); err != nil {
		return nil, err
	}
	return &r, nil
}

// ParseVideo resolves a public share URL to an apiz CDN download link.
func (c *Client) ParseVideo(ctx context.Context, shareURL string) (*ParseVideoResponse, error) {
	body := map[string]string{"url": shareURL}
	var r ParseVideoResponse
	if err := c.do(ctx, requestOptions{method: http.MethodPost, path: "/api/v3/tools/parse-video", body: body, auth: false}, &r); err != nil {
		return nil, err
	}
	return &r, nil
}

// TransferURL mirrors an external URL into the apiz CDN.
func (c *Client) TransferURL(ctx context.Context, externalURL, mediaType string) (*TransferURLResponse, error) {
	if mediaType == "" {
		mediaType = "image"
	}
	body := map[string]string{"url": externalURL, "type": mediaType}
	var r TransferURLResponse
	if err := c.do(ctx, requestOptions{method: http.MethodPost, path: "/api/v3/tools/transfer-url", body: body, auth: false}, &r); err != nil {
		return nil, err
	}
	return &r, nil
}

// ListSkills returns the tutorial / skill catalog.
func (c *Client) ListSkills(ctx context.Context, category string) ([]SkillSummary, error) {
	q := url.Values{}
	if category != "" {
		q.Set("category", category)
	}
	var env struct {
		Skills []SkillSummary `json:"skills"`
		Total  int            `json:"total"`
	}
	if err := c.do(ctx, requestOptions{method: http.MethodGet, path: "/api/v3/mcp/skills", query: q, auth: false}, &env); err != nil {
		return nil, err
	}
	return env.Skills, nil
}

// safePathEscape encodes a model id for use in a URL path while keeping `/`
// untouched (FastAPI's `{model_id:path}` matcher accepts raw slashes).
func safePathEscape(s string) string {
	parts := strings.Split(s, "/")
	for i, p := range parts {
		parts[i] = url.PathEscape(p)
	}
	return strings.Join(parts, "/")
}

// Suppress an unused var lint when callers don't import strconv directly.
var _ = strconv.Itoa
