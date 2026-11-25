-- ==============================================================================
-- 03_TRIGGERS.SQL: Database Triggers for Instant Webhook Dispatch
-- ==============================================================================

-- 1. Trigger on webhook_outbox_queue (Instant HTTP Notification to Worker)
-- Whenever a new webhook event is queued, immediately calls trigger_outbox_worker_on_insert()
DROP TRIGGER IF EXISTS trg_outbox_worker_on_insert ON public.webhook_outbox_queue;
CREATE TRIGGER trg_outbox_worker_on_insert
AFTER INSERT ON public.webhook_outbox_queue
FOR EACH ROW
WHEN (NEW.status = 'PENDING'::public."WebhookStatus")
EXECUTE FUNCTION public.trigger_outbox_worker_on_insert();
