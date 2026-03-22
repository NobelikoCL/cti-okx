"""
Market analysis algorithms:
  1. M15 Breakout  — last 20 candles, ruptura del rango de las primeras 19
  2. 1H LSRL       — regresión lineal mínimos cuadrados sobre cierres
  3. Volume Anomaly — volumen actual vs media de las últimas N velas
"""
from __future__ import annotations

import logging
from typing import Optional

import numpy as np
from django.conf import settings

logger = logging.getLogger(__name__)

VOLUME_THRESHOLD: float = getattr(settings, "VOLUME_THRESHOLD", 2.0)
BREAKOUT_THRESHOLD_PCT: float = getattr(settings, "BREAKOUT_THRESHOLD_PCT", 0.002)


# ── helpers ───────────────────────────────────────────────────────────────────

def _closes(candles: list[dict]) -> np.ndarray:
    return np.array([c["close"] for c in candles], dtype=float)


def _volumes(candles: list[dict]) -> np.ndarray:
    return np.array([c["volume"] for c in candles], dtype=float)


# ── 1. M15 Breakout ───────────────────────────────────────────────────────────

def detect_breakout(candles: list[dict]) -> Optional[dict]:
    """
    Requiere >= 20 velas M15 (oldest first).
    Rango: máximo high y mínimo low de las primeras 19 velas.
    Señal: si la vela 20 (la más reciente cerrada) rompe ese rango con volumen elevado.
    """
    if len(candles) < 20:
        return None

    lookback = candles[-20:-1]   # 19 velas de referencia
    current = candles[-1]        # vela más reciente

    range_high = max(c["high"] for c in lookback)
    range_low = min(c["low"] for c in lookback)

    vols = _volumes(lookback)
    avg_vol = float(np.mean(vols)) if vols.size else 0.0
    cur_vol = current["volume"]
    cur_close = current["close"]

    vol_ratio = cur_vol / avg_vol if avg_vol > 0 else 0.0

    if cur_close > range_high:
        pct = (cur_close - range_high) / range_high if range_high > 0 else 0
        confidence = min(pct / BREAKOUT_THRESHOLD_PCT, 1.0)
        return {
            "signal_type": "BREAKOUT_BULL",
            "timeframe": "15m",
            "price": cur_close,
            "breakout_level": range_high,
            "volume_ratio": vol_ratio,
            "confidence": confidence,
        }

    if cur_close < range_low:
        pct = (range_low - cur_close) / range_low if range_low > 0 else 0
        confidence = min(pct / BREAKOUT_THRESHOLD_PCT, 1.0)
        return {
            "signal_type": "BREAKOUT_BEAR",
            "timeframe": "15m",
            "price": cur_close,
            "breakout_level": range_low,
            "volume_ratio": vol_ratio,
            "confidence": confidence,
        }

    return None


# ── 2. 1H LSRL Regression ─────────────────────────────────────────────────────

def detect_regression_signal(candles: list[dict]) -> Optional[dict]:
    """
    LSRL sobre los cierres de velas 1H (>=20 velas recomendado).
    Devuelve señal si el R² es alto y la pendiente es significativa.
    """
    if len(candles) < 10:
        return None

    closes = _closes(candles)
    x = np.arange(len(closes), dtype=float)

    coeffs = np.polyfit(x, closes, 1)
    slope = float(coeffs[0])

    y_pred = np.polyval(coeffs, x)
    ss_res = float(np.sum((closes - y_pred) ** 2))
    ss_tot = float(np.sum((closes - np.mean(closes)) ** 2))
    r2 = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

    if r2 < 0.55:
        return None

    # Pendiente normalizada: % por vela respecto al primer cierre
    slope_pct = slope / closes[0] if closes[0] != 0 else 0.0

    price = float(closes[-1])

    if slope_pct > 0.0005:          # tendencia alcista > 0.05%/vela
        return {
            "signal_type": "REGRESSION_BULL",
            "timeframe": "1H",
            "price": price,
            "regression_slope": slope_pct,
            "regression_r2": r2,
            "confidence": min(r2, 1.0),
        }

    if slope_pct < -0.0005:         # tendencia bajista
        return {
            "signal_type": "REGRESSION_BEAR",
            "timeframe": "1H",
            "price": price,
            "regression_slope": slope_pct,
            "regression_r2": r2,
            "confidence": min(r2, 1.0),
        }

    return None


# ── 3. Volume Anomaly ─────────────────────────────────────────────────────────

def detect_volume_anomaly(candles: list[dict]) -> Optional[dict]:
    """
    Compara el volumen de la última vela con la media de las anteriores.
    Umbral configurable vía settings.VOLUME_THRESHOLD.
    """
    if len(candles) < 5:
        return None

    history = _volumes(candles[:-1])
    avg_vol = float(np.mean(history))
    cur_vol = candles[-1]["volume"]
    cur_close = candles[-1]["close"]

    if avg_vol <= 0:
        return None

    ratio = cur_vol / avg_vol
    if ratio < VOLUME_THRESHOLD:
        return None

    confidence = min((ratio - VOLUME_THRESHOLD) / VOLUME_THRESHOLD + 0.5, 1.0)
    return {
        "signal_type": "VOLUME_ANOMALY",
        "timeframe": "15m",
        "price": cur_close,
        "volume_ratio": ratio,
        "confidence": confidence,
    }


# ── Full analysis per symbol ──────────────────────────────────────────────────

def analyze_symbol(symbol: str) -> list[dict]:
    """
    Runs all three analyses for a symbol.
    Returns a list of signal dicts (may be empty).
    """
    from apps.scanner.okx_client import get_candles

    results: list[dict] = []

    # M15: 21 candles (20 complete + current, use last 20 closed)
    m15 = get_candles(symbol, "15m", limit=22)
    if m15 and len(m15) >= 20:
        sig = detect_breakout(m15)
        if sig:
            sig["symbol"] = symbol
            results.append(sig)

        vol_sig = detect_volume_anomaly(m15)
        if vol_sig:
            vol_sig["symbol"] = symbol
            results.append(vol_sig)

    # 1H: 50 candles for regression
    h1 = get_candles(symbol, "1H", limit=50)
    if h1 and len(h1) >= 10:
        sig = detect_regression_signal(h1)
        if sig:
            sig["symbol"] = symbol
            results.append(sig)

    return results
