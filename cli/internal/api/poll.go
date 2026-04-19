package api

import (
	"context"
	"fmt"
	"time"
)

// WaitForOptions tunes WaitFor behavior.
type WaitForOptions struct {
	PollInterval time.Duration
	Timeout      time.Duration
	OnProgress   func(*TaskResponse)
}

// WaitFor polls QueryTask until the task reaches a terminal state. Returns
// the final TaskResponse on success or APIError on failure / timeout.
func (c *Client) WaitFor(ctx context.Context, taskID string, opts WaitForOptions) (*TaskResponse, error) {
	if opts.PollInterval == 0 {
		opts.PollInterval = 5 * time.Second
	}
	if opts.Timeout == 0 {
		opts.Timeout = 10 * time.Minute
	}
	deadline := time.Now().Add(opts.Timeout)

	for {
		select {
		case <-ctx.Done():
			return nil, &APIError{Kind: ErrConnection, Message: "context cancelled while waiting for task"}
		default:
		}

		status, err := c.QueryTask(ctx, taskID)
		if err != nil {
			return nil, err
		}
		if opts.OnProgress != nil {
			opts.OnProgress(status)
		}
		switch status.Status {
		case "completed":
			return status, nil
		case "failed":
			msg := status.Error
			if msg == "" {
				msg = fmt.Sprintf("task %s failed", taskID)
			}
			return nil, &APIError{Kind: ErrUnknown, Message: msg, Detail: status}
		}
		if time.Now().Add(opts.PollInterval).After(deadline) {
			return nil, &APIError{
				Kind:    ErrTimeout,
				Message: fmt.Sprintf("task %s timed out after %s (last status: %s)", taskID, opts.Timeout, status.Status),
				Detail:  status,
			}
		}
		time.Sleep(opts.PollInterval)
	}
}
