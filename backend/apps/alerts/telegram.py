"""
Telegram notification helpers (sync, no async needed for Celery tasks).
Uses python-telegram-bot v21 in sync mode via ApplicationBuilder.
"""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

DIRECTION_EMOJI = {
    "BREAKOUT_BULL": "🟢",
    "BREAKOUT_BEAR": "🔴",
    "REGRESSION_BULL": "📈",
    "REGRESSION_BEAR": "📉",
    "VOLUME_ANOMALY": "⚡",
}

LABEL = {
    "BREAKOUT_BULL": "Ruptura Alcista (M15)",
    "BREAKOUT_BEAR": "Ruptura Bajista (M15)",
    "REGRESSION_BULL": "Regresión Alcista (1H)",
    "REGRESSION_BEAR": "Regresión Bajista (1H)",
    "VOLUME_ANOMALY": "Anomalía de Volumen",
}


def _build_message(signal) -> str:
    emoji = DIRECTION_EMOJI.get(signal.signal_type, "🔔")
    label = LABEL.get(signal.signal_type, signal.signal_type)
    slug = signal.symbol.lower()
    okx_url = f"https://www.okx.com/trade-swap/{slug}"
    lines = [
        f"{emoji} <b>CTIS OKX Signal</b>",
        f"📊 <b>{signal.symbol}</b> — <a href=\"{okx_url}\">Ver en OKX</a>",
        f"🏷 Tipo: {label}",
        f"⏱ Timeframe: {signal.timeframe}",
        f"💵 Precio: <code>{float(signal.price):.6f}</code>",
    ]

    if signal.breakout_level is not None:
        lines.append(f"🎯 Nivel roto: <code>{float(signal.breakout_level):.6f}</code>")

    if signal.regression_slope is not None:
        slope_pct = signal.regression_slope * 100
        r2 = signal.regression_r2 or 0
        lines.append(f"📐 Pendiente: <code>{slope_pct:+.4f}%</code>/vela | R²: <code>{r2:.3f}</code>")

    if signal.volume_ratio is not None:
        lines.append(f"📦 Vol ratio: <code>{signal.volume_ratio:.2f}x</code>")

    lines.append(f"🎲 Confianza: <code>{signal.confidence * 100:.1f}%</code>")
    lines.append(f"🕐 {signal.created_at.strftime('%Y-%m-%d %H:%M UTC')}")

    return "\n".join(lines)


def _get_credentials():
    """Return (token, chat_id) — DB config takes priority over settings."""
    from apps.alerts.models import BotConfig
    cfg = BotConfig.get()
    if cfg and cfg.token and cfg.chat_id:
        return cfg.token, cfg.chat_id
    return (
        getattr(settings, "TELEGRAM_BOT_TOKEN", ""),
        getattr(settings, "TELEGRAM_CHAT_ID", ""),
    )


def send_signal(signal) -> bool:
    """
    Send a signal notification via Telegram Bot API (synchronous HTTP).
    Returns True on success.
    """
    token, chat_id = _get_credentials()

    if not token or not chat_id:
        logger.warning("Telegram not configured, skipping alert for signal %s", signal.id)
        return False

    text = _build_message(signal)
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }

    try:
        resp = requests.post(url, json=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if data.get("ok"):
            logger.info("Telegram sent for signal %s", signal.id)
            return True
        logger.error("Telegram API error: %s", data)
        return False
    except Exception as exc:
        logger.exception("Failed to send Telegram for signal %s: %s", signal.id, exc)
        return False


def send_test_message(token: str, chat_id: str) -> bool:
    """Test connectivity with custom token/chat_id."""
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": "✅ <b>CTIS OKX</b> — Conexión Telegram verificada correctamente.",
        "parse_mode": "HTML",
    }
    try:
        resp = requests.post(url, json=payload, timeout=10)
        data = resp.json()
        return bool(data.get("ok"))
    except Exception:
        return False
