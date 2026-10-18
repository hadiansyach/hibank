package ledger

import (
	"context"
	"log/slog"
	"sync"
	"time"
)

// Auditor periodically runs ledger invariant audits across all active accounts in the background.
type Auditor struct {
	service  *Service
	interval time.Duration
	stopCh   chan struct{}
	wg       sync.WaitGroup
}

// NewAuditor creates a new background ledger auditor.
func NewAuditor(service *Service, interval time.Duration) *Auditor {
	if interval <= 0 {
		interval = 5 * time.Minute
	}
	return &Auditor{
		service:  service,
		interval: interval,
		stopCh:   make(chan struct{}),
	}
}

// Start begins periodic background audits in a separate goroutine.
func (a *Auditor) Start(ctx context.Context) {
	a.wg.Add(1)
	go func() {
		defer a.wg.Done()
		slog.Info("Starting background ledger auditor", "interval", a.interval.String())

		// Run immediate audit on startup
		if report, err := a.service.AuditAllAccounts(ctx); err != nil {
			slog.Warn("Initial background ledger audit failed", "error", err)
		} else {
			if len(report.Violations) > 0 {
				slog.Error("CRITICAL: Initial background ledger audit found invariant violations!",
					"violations_count", len(report.Violations),
					"total_scanned", report.TotalScanned,
				)
			} else {
				slog.Info("Initial background ledger audit completed successfully",
					"total_scanned", report.TotalScanned,
				)
			}
		}

		ticker := time.NewTicker(a.interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				slog.Info("Background ledger auditor stopping (context cancelled)")
				return
			case <-a.stopCh:
				slog.Info("Background ledger auditor stopped")
				return
			case <-ticker.C:
				report, err := a.service.AuditAllAccounts(ctx)
				if err != nil {
					slog.Error("Periodic background ledger audit failed", "error", err)
					continue
				}

				if len(report.Violations) > 0 {
					slog.Error("CRITICAL: Periodic background ledger audit found invariant violations!",
						"violations_count", len(report.Violations),
						"total_scanned", report.TotalScanned,
					)
				} else {
					slog.Debug("Periodic background ledger audit passed",
						"total_scanned", report.TotalScanned,
					)
				}
			}
		}
	}()
}

// Stop signals the background auditor to stop and waits for the goroutine to finish.
func (a *Auditor) Stop() {
	close(a.stopCh)
	a.wg.Wait()
}
