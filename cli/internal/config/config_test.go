package config

import (
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoadMissingReturnsEmptyFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "missing.toml")
	f, err := Load(path)
	require.NoError(t, err)
	assert.Empty(t, f.Profiles)
	assert.Empty(t, f.DefaultProfile)
}

func TestSaveAndLoadRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.toml")
	f := &File{}
	f.SetProfile("default", Profile{APIKey: "sk-not-a-real-key", BaseURL: "https://test-ts-api.fyshark.com"})
	f.SetProfile("prod", Profile{APIKey: "sk-prod-not-real-key"})
	require.NoError(t, Save(path, f))

	loaded, err := Load(path)
	require.NoError(t, err)
	assert.Equal(t, "default", loaded.DefaultProfile)
	assert.Equal(t, "sk-not-a-real-key", loaded.Profiles["default"].APIKey)
	assert.Equal(t, "https://test-ts-api.fyshark.com", loaded.Profiles["default"].BaseURL)
	assert.Equal(t, "sk-prod-not-real-key", loaded.Profiles["prod"].APIKey)
}

func TestResolveDefault(t *testing.T) {
	f := &File{}
	f.SetProfile("alpha", Profile{APIKey: "key-a"})
	f.SetProfile("beta", Profile{APIKey: "key-b"})
	f.DefaultProfile = "beta"

	p, ok := f.Resolve("")
	require.True(t, ok)
	assert.Equal(t, "key-b", p.APIKey)

	p, ok = f.Resolve("alpha")
	require.True(t, ok)
	assert.Equal(t, "key-a", p.APIKey)

	_, ok = f.Resolve("missing")
	assert.False(t, ok)
}

func TestDefaultPathHonorsEnvVar(t *testing.T) {
	t.Setenv("APIZ_CONFIG_PATH", "/tmp/explicit/config.toml")
	got, err := DefaultPath()
	require.NoError(t, err)
	assert.Equal(t, "/tmp/explicit/config.toml", got)
}

func TestSerializedFormatStableAcrossRuns(t *testing.T) {
	f := &File{DefaultProfile: "default"}
	f.SetProfile("default", Profile{APIKey: "sk-a"})
	f.SetProfile("staging", Profile{APIKey: "sk-b", BaseURL: "https://test-ts-api.fyshark.com"})
	body := serialize(f)
	assert.Contains(t, body, `default_profile = "default"`)
	assert.Contains(t, body, `[profile.default]`)
	assert.Contains(t, body, `[profile.staging]`)
	// alphabetic ordering ensures determinism
	assert.Less(t, indexOf(body, `[profile.default]`), indexOf(body, `[profile.staging]`))
}

func indexOf(haystack, needle string) int {
	for i := 0; i+len(needle) <= len(haystack); i++ {
		if haystack[i:i+len(needle)] == needle {
			return i
		}
	}
	return -1
}
