package logger

import (
	"bytes"
	"context"
	"log/slog"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLogger_Setup_Development(t *testing.T) {
	buf := &bytes.Buffer{}
	l := Setup("development", slog.LevelDebug, buf)
	assert.NotNil(t, l)

	l.Info("test dev log message", "key", "val")
	assert.Contains(t, buf.String(), "test dev log message")
	assert.Contains(t, buf.String(), "key=val")
}

func TestLogger_Setup_Production(t *testing.T) {
	buf := &bytes.Buffer{}
	l := Setup("production", slog.LevelInfo, buf)
	assert.NotNil(t, l)

	l.Info("test prod log message", "key", "val")
	assert.Contains(t, buf.String(), `"msg":"test prod log message"`)
	assert.Contains(t, buf.String(), `"key":"val"`)
}

func TestLogger_ContextRequestID(t *testing.T) {
	ctx := context.Background()
	assert.Empty(t, GetRequestID(ctx))

	ctxWithID := WithRequestID(ctx, "req-xyz-987")
	assert.Equal(t, "req-xyz-987", GetRequestID(ctxWithID))

	ctxLogger := FromContext(ctxWithID)
	assert.NotNil(t, ctxLogger)
}
