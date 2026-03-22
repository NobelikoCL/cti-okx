import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, queue="alerts", max_retries=3, default_retry_delay=60)
def send_telegram_alert(self, signal_id: int):
    """Send Telegram notification for a given Signal id."""
    from apps.signals.models import Signal
    from apps.alerts.telegram import send_signal

    try:
        signal = Signal.objects.get(pk=signal_id)
    except Signal.DoesNotExist:
        logger.warning("Signal %s not found for Telegram alert", signal_id)
        return

    if signal.is_sent_telegram:
        return

    success = send_signal(signal)
    if success:
        Signal.objects.filter(pk=signal_id).update(is_sent_telegram=True)
    else:
        raise self.retry(exc=Exception(f"Telegram send failed for signal {signal_id}"))
