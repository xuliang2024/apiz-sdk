package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

// Volcengine captioning model ids that the backend exposes.
const (
	captioningSpeechModel  = "volcengine/captioning/ata-speech"
	captioningSingingModel = "volcengine/captioning/ata-singing"
)

// CaptioningModelFor returns the backend model id for a given mode.
func CaptioningModelFor(mode string) string {
	if mode == "singing" {
		return captioningSingingModel
	}
	return captioningSpeechModel
}

// Align submits a forced-alignment task and waits for the result, returning
// the structured AlignResult. It mirrors the TS / Python `client.align()` helpers.
func (c *Client) Align(ctx context.Context, params AlignParams, opts WaitForOptions) (*AlignResult, error) {
	if params.AudioURL == "" {
		return nil, errors.New("apiz align: audio_url is required")
	}
	if params.AudioText == "" {
		return nil, errors.New("apiz align: audio_text is required")
	}

	body := map[string]interface{}{
		"audio_url":  params.AudioURL,
		"audio_text": params.AudioText,
	}
	if params.StaPuncMode != 0 {
		body["sta_punc_mode"] = params.StaPuncMode
	}

	created, err := c.CreateTask(ctx, CaptioningModelFor(params.Mode), body)
	if err != nil {
		return nil, err
	}

	if created.Status == "completed" && created.Result != nil {
		return parseAlignResult(created)
	}
	if created.TaskID == "" {
		return nil, fmt.Errorf("apiz align: backend returned no task_id")
	}

	if opts.PollInterval == 0 {
		opts.PollInterval = 2 * time.Second
	}
	if opts.Timeout == 0 {
		opts.Timeout = 5 * time.Minute
	}

	final, err := c.WaitFor(ctx, created.TaskID, opts)
	if err != nil {
		return nil, err
	}
	return parseAlignResult(final)
}

// parseAlignResult extracts the AlignResult from a TaskResponse.Result map.
func parseAlignResult(t *TaskResponse) (*AlignResult, error) {
	if t.Result == nil {
		return nil, fmt.Errorf("apiz align: response missing result")
	}
	raw, err := json.Marshal(t.Result)
	if err != nil {
		return nil, fmt.Errorf("apiz align: re-marshal result: %w", err)
	}
	var r AlignResult
	if err := json.Unmarshal(raw, &r); err != nil {
		return nil, fmt.Errorf("apiz align: decode result: %w", err)
	}
	r.TaskID = t.TaskID
	r.Price = t.Price
	return &r, nil
}
