"""
OKX public market data client.
No authentication required for market data endpoints.
"""
import logging
from typing import Optional
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

_FLAG = "1" if getattr(settings, "OKX_SIMULATED", False) else "0"


def _market_api():
    from okx.MarketData import MarketAPI
    return MarketAPI(
        api_key=settings.OKX_API_KEY,
        api_secret_key=settings.OKX_SECRET_KEY,
        passphrase=settings.OKX_PASSPHRASE,
        flag=_FLAG,
    )


def _public_api():
    from okx.PublicData import PublicAPI
    return PublicAPI(flag=_FLAG)


def get_top_symbols_by_volume(n: int = 50) -> list[str]:
    """
    Return the top-N USDT-margined perpetual swaps ranked by 24h quote volume.
    Uses the market tickers endpoint (no auth required). Cached 15 minutes.
    """
    from django.conf import settings as _settings
    n = getattr(_settings, "TOP_SYMBOLS_COUNT", n)
    cache_key = f"okx:top_symbols_vol:{n}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        mkt = _market_api()
        result = mkt.get_tickers(instType="SWAP")
        if result.get("code") != "0":
            logger.error("OKX tickers error: %s", result)
            return []

        tickers = [
            item for item in result.get("data", [])
            if item.get("instId", "").endswith("-USDT-SWAP")
        ]

        # Sort descending by 24h quote volume (volCcyQuote = volume in USDT)
        tickers.sort(
            key=lambda x: float(x.get("volCcyQuote", 0) or 0),
            reverse=True,
        )

        symbols = [t["instId"] for t in tickers[:n]]
        cache.set(cache_key, symbols, timeout=900)  # 15 min cache
        logger.info("Top %d USDT-SWAP by 24h volume: %s...", n, symbols[:5])
        return symbols
    except Exception as exc:
        logger.exception("Failed to fetch top symbols by volume: %s", exc)
        return []


def get_candles(inst_id: str, bar: str, limit: int = 21) -> Optional[list[dict]]:
    """
    Fetch candlestick data for a given instrument and timeframe.

    OKX returns candles newest-first. We reverse so index 0 = oldest.
    Each dict: {ts, open, high, low, close, volume}
    bar examples: "15m", "1H"
    """
    try:
        mkt = _market_api()
        result = mkt.get_candlesticks(instId=inst_id, bar=bar, limit=str(limit))
        if result.get("code") != "0":
            logger.warning("OKX candles error for %s/%s: %s", inst_id, bar, result)
            return None

        raw = result.get("data", [])
        # raw[i] = [ts, open, high, low, close, vol, volCcy, volCcyQuote, confirm]
        candles = []
        for row in reversed(raw):  # oldest first
            try:
                candles.append({
                    "ts": int(row[0]),
                    "open": float(row[1]),
                    "high": float(row[2]),
                    "low": float(row[3]),
                    "close": float(row[4]),
                    "volume": float(row[5]),
                })
            except (IndexError, ValueError):
                continue
        return candles if candles else None
    except Exception as exc:
        logger.exception("Failed to fetch candles %s/%s: %s", inst_id, bar, exc)
        return None


def get_ticker(inst_id: str) -> Optional[float]:
    """Return latest mark price (last trade price)."""
    try:
        mkt = _market_api()
        result = mkt.get_ticker(instId=inst_id)
        if result.get("code") != "0":
            return None
        data = result.get("data", [{}])
        return float(data[0].get("last", 0)) if data else None
    except Exception:
        return None
