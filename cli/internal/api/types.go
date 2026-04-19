// Package api implements the apiz REST client used by the CLI. It mirrors the
// behavior of @apiz/sdk and apiz (Python) but is intentionally kept small and
// dependency-free: standard library net/http only.
package api

// BalanceResponse maps GET /api/v3/balance.
type BalanceResponse struct {
	UserID       int64   `json:"user_id"`
	Balance      float64 `json:"balance"`
	BalanceYuan  float64 `json:"balance_yuan"`
	VipLevel     int     `json:"vip_level"`
	Unit         string  `json:"unit,omitempty"`
	ExchangeRate string  `json:"exchange_rate,omitempty"`
}

// CheckinResponse maps POST /api/v3/checkin.
type CheckinResponse struct {
	Success          bool    `json:"success"`
	AlreadyCheckedIn bool    `json:"already_checked_in,omitempty"`
	PointsAwarded    float64 `json:"points_awarded,omitempty"`
	VipLevel         int     `json:"vip_level,omitempty"`
	Balance          float64 `json:"balance,omitempty"`
	BalanceYuan      float64 `json:"balance_yuan,omitempty"`
	Message          string  `json:"message,omitempty"`
}

// TaskResponse is the unified shape of /api/v3/tasks/create + /v3/tasks/query.
type TaskResponse struct {
	TaskID      string                 `json:"task_id"`
	Status      string                 `json:"status"`
	Channel     string                 `json:"channel,omitempty"`
	Model       string                 `json:"model,omitempty"`
	Progress    float64                `json:"progress,omitempty"`
	Result      map[string]interface{} `json:"result,omitempty"`
	Error       string                 `json:"error,omitempty"`
	Price       float64                `json:"price,omitempty"`
	CreatedAt   string                 `json:"created_at,omitempty"`
	CompletedAt string                 `json:"completed_at,omitempty"`
}

// ModelStats summarises operational health.
type ModelStats struct {
	SuccessRate     float64 `json:"success_rate,omitempty"`
	PendingTasks    int     `json:"pending_tasks,omitempty"`
	ProcessingTasks int     `json:"processing_tasks,omitempty"`
}

// ModelPricing is the canonical pricing struct.
type ModelPricing struct {
	Unit   string  `json:"unit"`
	Amount float64 `json:"amount"`
}

// ModelSummary is the list-page row.
type ModelSummary struct {
	ID         string        `json:"id"`
	Name       string        `json:"name"`
	Category   string        `json:"category"`
	Capability string        `json:"capability,omitempty"`
	CoverURL   string        `json:"cover_url,omitempty"`
	Tags       []string      `json:"tags,omitempty"`
	IsHot      bool          `json:"isHot,omitempty"`
	Stats      *ModelStats   `json:"stats,omitempty"`
	Pricing    *ModelPricing `json:"pricing,omitempty"`
}

// ModelDetail extends ModelSummary with full schema and description.
type ModelDetail struct {
	ModelSummary
	Description  string                 `json:"description,omitempty"`
	ParamsSchema map[string]interface{} `json:"params_schema,omitempty"`
	Channel      string                 `json:"channel,omitempty"`
}

// ModelDocs is the tutorial returned by GET /v3/models/{id}/docs.
type ModelDocs struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Lang     string `json:"lang"`
	Tutorial string `json:"tutorial"`
}

// VoiceItem is one entry in the public/user voices list.
type VoiceItem struct {
	VoiceID   string   `json:"voice_id"`
	VoiceName string   `json:"voice_name"`
	Tags      []string `json:"tags,omitempty"`
	AudioURL  string   `json:"audio_url,omitempty"`
}

// VoiceListResponse is the wrapper returned by POST /v3/minimax/voices.
type VoiceListResponse struct {
	UserVoices   []VoiceItem `json:"user_voices"`
	PublicVoices []VoiceItem `json:"public_voices"`
	Statistics   struct {
		UserTotalCount    int `json:"user_total_count"`
		UserActiveCount   int `json:"user_active_count"`
		UserExpiredCount  int `json:"user_expired_count"`
		PublicVoicesCount int `json:"public_voices_count"`
	} `json:"statistics"`
}

// SynthesizeResponse is the result of POST /v3/minimax/t2a.
type SynthesizeResponse struct {
	TaskID   string  `json:"task_id,omitempty"`
	Status   string  `json:"status,omitempty"`
	AudioURL string  `json:"audio_url"`
	Duration float64 `json:"duration,omitempty"`
	Model    string  `json:"model,omitempty"`
	Price    float64 `json:"price,omitempty"`
}

// ParseVideoResponse is the result of POST /v3/tools/parse-video.
type ParseVideoResponse struct {
	Platform string  `json:"platform"`
	Title    string  `json:"title,omitempty"`
	Author   string  `json:"author,omitempty"`
	VideoURL string  `json:"video_url"`
	CoverURL string  `json:"cover_url,omitempty"`
	Duration float64 `json:"duration,omitempty"`
}

// TransferURLResponse is the result of POST /v3/tools/transfer-url.
type TransferURLResponse struct {
	OriginalURL string `json:"original_url"`
	CDNURL      string `json:"cdn_url"`
	Type        string `json:"type"`
	SizeBytes   int64  `json:"size_bytes,omitempty"`
}

// SkillSummary mirrors what's returned by GET /v3/mcp/skills.
type SkillSummary struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Category    string   `json:"category"`
	Description string   `json:"description,omitempty"`
	Models      []string `json:"models,omitempty"`
}
