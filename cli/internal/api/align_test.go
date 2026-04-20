package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCaptioningModelFor(t *testing.T) {
	assert.Equal(t, "volcengine/captioning/ata-speech", CaptioningModelFor("speech"))
	assert.Equal(t, "volcengine/captioning/ata-speech", CaptioningModelFor(""))
	assert.Equal(t, "volcengine/captioning/ata-singing", CaptioningModelFor("singing"))
}

func TestAlignRequiresAudioURLAndText(t *testing.T) {
	c := New(Config{APIKey: testAPIKey, BaseURL: "https://example.invalid"})
	_, err := c.Align(context.Background(), AlignParams{}, WaitForOptions{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "audio_url")

	_, err = c.Align(context.Background(), AlignParams{AudioURL: "https://x.mp3"}, WaitForOptions{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "audio_text")
}

func TestAlignSubmitsAndPolls(t *testing.T) {
	const sampleResult = `{
		"code":200,
		"data":{
			"task_id":"task_volc_ata_001",
			"status":"completed",
			"result":{
				"duration":5.503,
				"utterances":[
					{"text":"如果您没有其他需要举报的话","start_time":1,"end_time":1840,
					 "words":[{"text":"如","start_time":1,"end_time":140}]},
					{"text":"祝您生活愉快，再见","start_time":3241,"end_time":5505,"words":[]}
				]
			}
		}
	}`

	mux := http.NewServeMux()
	mux.HandleFunc("/api/v3/tasks/create", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"code":200,"data":{"task_id":"task_volc_ata_001","status":"pending","model":"volcengine/captioning/ata-speech","price":10}}`))
	})
	mux.HandleFunc("/api/v3/tasks/query", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(sampleResult))
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)

	c := New(Config{APIKey: testAPIKey, BaseURL: srv.URL})
	r, err := c.Align(context.Background(), AlignParams{
		AudioURL:    "https://example.com/talk.mp3",
		AudioText:   "如果您没有其他需要举报的话，这边就先挂断了。祝您生活愉快，再见。",
		Mode:        "speech",
		StaPuncMode: 1,
	}, WaitForOptions{PollInterval: time.Millisecond})

	require.NoError(t, err)
	assert.Equal(t, "task_volc_ata_001", r.TaskID)
	assert.Equal(t, 5.503, r.Duration)
	require.Len(t, r.Utterances, 2)
	assert.Equal(t, "如果您没有其他需要举报的话", r.Utterances[0].Text)
	assert.Equal(t, "如", r.Utterances[0].Words[0].Text)
	assert.Equal(t, 1, r.Utterances[0].Words[0].StartTime)
}
