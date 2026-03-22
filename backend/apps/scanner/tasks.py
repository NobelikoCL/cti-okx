"""
Celery tasks for the market scanner.
"""
import logging
import time
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

MAX_SIGNALS_PER_ASSET: int = getattr(settings, "MAX_SIGNALS_PER_ASSET", 3)
DEDUP_WINDOW_MINUTES: int = 30  # ignore duplicate signal within this window


def _is_duplicate(symbol: str, signal_type: str, timeframe: str) -> bool:
    """Return True if the same signal was already emitted within the dedup window."""
    from apps.signals.models import Signal
    cutoff = timezone.now() - timedelta(minutes=DEDUP_WINDOW_MINUTES)
    return Signal.objects.filter(
        symbol=symbol,
        signal_type=signal_type,
        timeframe=timeframe,
        created_at__gte=cutoff,
    ).exists()


def _save_signal(data: dict):
    from apps.signals.models import Signal
    signal = Signal.objects.create(
        symbol=data["symbol"],
        signal_type=data["signal_type"],
        timeframe=data.get("timeframe", ""),
        price=data["price"],
        breakout_level=data.get("breakout_level"),
        regression_slope=data.get("regression_slope"),
        regression_r2=data.get("regression_r2"),
        volume_ratio=data.get("volume_ratio"),
        confidence=data.get("confidence", 0.0),
    )
    logger.info("Signal saved: %s %s @ %.6f", signal.symbol, signal.signal_type, float(signal.price))
    return signal


@shared_task(bind=True, queue="scanner", max_retries=2, default_retry_delay=30)
def scan_markets(self):
    """
    Main periodic task:
    1. Fetch all USDT-SWAP instruments
    2. Analyze each one (M15 breakout, 1H regression, volume anomaly)
    3. Persist new signals
    4. Queue Telegram alerts
    """
    from apps.scanner.okx_client import get_top_symbols_by_volume
    from apps.scanner.analysis import analyze_symbol

    logger.info("scan_markets started")
    instruments = get_top_symbols_by_volume()
    if not instruments:
        logger.warning("No instruments fetched, aborting scan")
        return

    total_signals = 0
    # Rate-limit: ~200ms between requests to stay within OKX public limits
    for inst_id in instruments:
        try:
            signals = analyze_symbol(inst_id)
            for data in signals:
                symbol = data["symbol"]
                sig_type = data["signal_type"]
                tf = data.get("timeframe", "")

                if _is_duplicate(symbol, sig_type, tf):
                    continue

                signal = _save_signal(data)
                total_signals += 1

                # Queue Telegram alert (non-blocking)
                from apps.alerts.tasks import send_telegram_alert
                send_telegram_alert.apply_async(
                    args=[signal.id],
                    queue="alerts",
                )

            time.sleep(0.2)
        except Exception as exc:
            logger.exception("Error analyzing %s: %s", inst_id, exc)
            continue

    logger.info("scan_markets finished: %d new signals", total_signals)
    return total_signals


@shared_task(bind=True, queue="scanner")
def scan_single_symbol(self, symbol: str):
    """Trigger analysis for a single symbol (used for manual refresh)."""
    from apps.scanner.analysis import analyze_symbol

    signals = analyze_symbol(symbol)
    saved_ids = []
    for data in signals:
        if not _is_duplicate(data["symbol"], data["signal_type"], data.get("timeframe", "")):
            sig = _save_signal(data)
            saved_ids.append(sig.id)
            from apps.alerts.tasks import send_telegram_alert
            send_telegram_alert.apply_async(args=[sig.id], queue="alerts")
    return saved_ids
