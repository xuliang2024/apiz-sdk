package api

import "fmt"

// ErrorKind categorises HTTP failures. CLI exit codes map onto these.
type ErrorKind int

const (
	ErrUnknown ErrorKind = iota
	ErrAuthentication
	ErrPermissionDenied
	ErrNotFound
	ErrValidation
	ErrInsufficientBalance
	ErrRateLimit
	ErrServer
	ErrTimeout
	ErrConnection
)

// APIError is the unified error type returned by the client.
type APIError struct {
	Kind    ErrorKind
	Status  int
	Code    int
	Message string
	Detail  interface{}
}

func (e *APIError) Error() string {
	if e.Status > 0 {
		return fmt.Sprintf("apiz: HTTP %d — %s", e.Status, e.Message)
	}
	return fmt.Sprintf("apiz: %s", e.Message)
}

// errorFromStatus picks the right kind for the HTTP status.
func errorFromStatus(status int, message string, code int, detail interface{}) *APIError {
	kind := ErrUnknown
	switch {
	case status == 401:
		kind = ErrAuthentication
	case status == 402:
		kind = ErrInsufficientBalance
	case status == 403:
		kind = ErrPermissionDenied
	case status == 404:
		kind = ErrNotFound
	case status == 422 || status == 400:
		kind = ErrValidation
	case status == 429:
		kind = ErrRateLimit
	case status >= 500:
		kind = ErrServer
	}
	return &APIError{
		Kind:    kind,
		Status:  status,
		Code:    code,
		Message: message,
		Detail:  detail,
	}
}
