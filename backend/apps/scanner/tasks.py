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

DEDUP_WINDOW_MINUTES: int = 30  # ignore duplicate signal within this window


def _telegram_cooldown_ok(symbol: str, signal_type: str, cooldown_minutes: int) -> bool:
    """Return True if no Telegram was sent for this symbol+type within cooldown_minutes."""
    from apps.signals.models import Signal
    if cooldown_minutes <= 0:
        return True
    cutoff = timezone.now() - timedelta(minutes=cooldown_minutes)
    return not Signal.objects.filter(
        symbol=symbol,
        signal_type=signal_type,
        is_sent_telegram=True,
        created_at__gte=cutoff,
    ).exists()


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


def _count_recent(symbol: str, signal_type: str) -> int:
    """Count signals for this symbol+type in the last 24 hours (excluding the one being saved)."""
    from apps.signals.models import Signal
    cutoff = timezone.now() - timedelta(hours=24)
    return Signal.objects.filter(
        symbol=symbol,
        signal_type=signal_type,
        created_at__gte=cutoff,
    ).count()


def _save_signal(data: dict):
    from apps.signals.models import Signal
    repeat_count = _count_recent(data["symbol"], data["signal_type"]) + 1
    signal = Signal.objects.create(
        symbol        = data["symbol"],
        signal_type   = data["signal_type"],
        timeframe     = data.get("timeframe", ""),
        price         = data["price"],
        breakout_level    = data.get("breakout_level"),
        regression_slope  = data.get("regression_slope"),
        regression_r2     = data.get("regression_r2"),
        volume_ratio      = data.get("volume_ratio"),
        rsi               = data.get("rsi"),
        atr               = data.get("atr"),
        stop_loss         = data.get("stop_loss"),
        take_profit       = data.get("take_profit"),
        risk_reward       = data.get("risk_reward"),
        funding_rate      = data.get("funding_rate"),
        trend_reversal    = data.get("trend_reversal"),
        confidence        = data.get("confidence", 0.0),
        repeat_count      = repeat_count,
    )
    logger.info(
        "Signal saved: %s %s @ %.6f | conf=%.2f | RR=%.2f | funding=%s",
        signal.symbol, signal.signal_type, float(signal.price),
        signal.confidence,
        signal.risk_reward or 0,
        f"{signal.funding_rate:.4f}" if signal.funding_rate is not None else "n/a",
    )
    return signal


@shared_task(bind=True, queue="scanner", max_retries=2, default_retry_delay=30)
def scan_markets(self):
    """
    Main periodic task:
    1. Fetch top-N USDT-SWAP instruments by 24h volume
    2. Analyze each one (M15 breakout, 1H regression, volume anomaly)
    3. Enrich each signal with funding rate
    4. Persist new signals
    5. Queue Telegram alerts
    """
    from apps.scanner.okx_client import get_top_symbols_by_volume, get_funding_rate
    from apps.scanner.analysis import analyze_symbol
    from apps.scanner.models import ScannerConfig

    cfg = ScannerConfig.get()
    logger.info("scan_markets started")
    instruments = get_top_symbols_by_volume(cfg.top_symbols_count)
    if not instruments:
        logger.warning("No instruments fetched, aborting scan")
        return

    total_signals = 0
    # Rate-limit: ~200ms between symbols to stay within OKX public limits
    for inst_id in instruments:
        try:
            signals = analyze_symbol(inst_id)

            # Fetch funding rate once per symbol (cached 8 min)
            funding = get_funding_rate(inst_id)

            for data in signals:
                symbol   = data["symbol"]
                sig_type = data["signal_type"]
                tf       = data.get("timeframe", "")

                if _is_duplicate(symbol, sig_type, tf):
                    continue

                # Inject funding rate into signal data
                data["funding_rate"] = funding

                signal = _save_signal(data)
                total_signals += 1

                if (
                    cfg.should_telegram(signal.signal_type, trend_reversal=bool(signal.trend_reversal))
                    and signal.confidence >= cfg.telegram_min_confidence_tg
                    and _telegram_cooldown_ok(signal.symbol, signal.signal_type, cfg.telegram_cooldown_minutes)
                ):
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
    from apps.scanner.okx_client import get_funding_rate

    funding = get_funding_rate(symbol)
    signals = analyze_symbol(symbol)
    saved_ids = []
    for data in signals:
        if not _is_duplicate(data["symbol"], data["signal_type"], data.get("timeframe", "")):
            data["funding_rate"] = funding
            sig = _save_signal(data)
            saved_ids.append(sig.id)
            from apps.alerts.tasks import send_telegram_alert
            send_telegram_alert.apply_async(args=[sig.id], queue="alerts")
    return saved_ids
