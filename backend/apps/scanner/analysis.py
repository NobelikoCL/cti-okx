"""
Market analysis algorithms:
  1. M15 Breakout  — last 20 confirmed candles, ruptura del rango de las primeras 19
                     requiere confirmación de volumen (vol > 1.5x media)
                     filtrado por RSI(14): no LONG si RSI>75, no SHORT si RSI<25
  2. 1H LSRL       — regresión lineal mínimos cuadrados sobre cierres
                     test de significancia estadística (p-value < 0.05)
                     R² mínimo configurable (default 0.65)
  3. Volume Anomaly — z-score de volumen vs media+std de ventana histórica
                     umbral: z > 2.0 (percentil 97.7%)

Confianza: multi-factor ponderada en lugar de lineal simple.
ATR(14): calculado para todos los tipos → SL/TP automáticos.
"""
from __future__ import annotations

import logging
from typing import Optional

import numpy as np
from scipy import stats as scipy_stats
from django.conf import settings

logger = logging.getLogger(__name__)

# ── Settings ──────────────────────────────────────────────────────────────────
BREAKOUT_THRESHOLD_PCT: float = getattr(settings, "BREAKOUT_THRESHOLD_PCT", 0.002)
BREAKOUT_VOL_MIN_RATIO: float = getattr(settings, "BREAKOUT_VOL_MIN_RATIO", 1.5)
REGRESSION_R2_MIN: float      = getattr(settings, "REGRESSION_R2_MIN", 0.65)
REGRESSION_PVALUE_MAX: float  = getattr(settings, "REGRESSION_PVALUE_MAX", 0.05)
RSI_OVERBOUGHT: float         = getattr(settings, "RSI_OVERBOUGHT", 75.0)
RSI_OVERSOLD: float           = getattr(settings, "RSI_OVERSOLD", 25.0)
VOLUME_ZSCORE_MIN: float      = getattr(settings, "VOLUME_THRESHOLD", 2.0)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _closes(candles: list[dict]) -> np.ndarray:
    return np.array([c["close"] for c in candles], dtype=float)


def _volumes(candles: list[dict]) -> np.ndarray:
    return np.array([c["volume"] for c in candles], dtype=float)


def _rsi(closes: np.ndarray, period: int = 14) -> float:
    """RSI(period) using simple moving average of gains/losses. Pure numpy."""
    if len(closes) < period + 1:
        return 50.0  # neutral if not enough data
    deltas = np.diff(closes[-(period + 1):])
    gains  = np.where(deltas > 0, deltas, 0.0)
    losses = np.where(deltas < 0, -deltas, 0.0)
    avg_gain = float(np.mean(gains))
    avg_loss = float(np.mean(losses)) or 1e-9
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))


def _atr(candles: list[dict], period: int = 14) -> float:
    """Average True Range over the last `period` candles."""
    if len(candles) < period + 1:
        period = len(candles) - 1
    if period <= 0:
        return 0.0
    trs = []
    for i in range(1, period + 1):
        c = candles[-period - 1 + i]
        prev_close = candles[-period - 1 + i - 1]["close"]
        tr = max(
            c["high"] - c["low"],
            abs(c["high"] - prev_close),
            abs(c["low"]  - prev_close),
        )
        trs.append(tr)
    return float(np.mean(trs)) if trs else 0.0


def _sl_tp(price: float, atr: float, direction: str) -> tuple[float, float]:
    """Return (stop_loss, take_profit) based on ATR and direction."""
    sl_mult = 1.5
    tp_mult = 2.0
    if direction == "LONG":
        return price - sl_mult * atr, price + tp_mult * atr
    if direction == "SHORT":
        return price + sl_mult * atr, price - tp_mult * atr
    # NEUTRAL — symmetric
    return price - sl_mult * atr, price + tp_mult * atr


# ── 1. M15 Breakout ───────────────────────────────────────────────────────────

def detect_breakout(candles: list[dict], timeframe: str = "15m") -> Optional[dict]:
    """
    Requiere >= 20 velas M15 confirmadas (oldest first).
    Rango: máximo high y mínimo low de las primeras 19 velas.
    Señal: si la vela 20 (la más reciente) rompe ese rango CON volumen confirmado.

    Filtros adicionales:
    - vol_ratio >= BREAKOUT_VOL_MIN_RATIO (ruptura sin volumen = falsa)
    - RSI(14) no overbought en BULL ni oversold en BEAR
    """
    if len(candles) < 20:
        return None

    lookback = candles[-20:-1]   # 19 velas de referencia
    current  = candles[-1]       # vela más reciente

    range_high = max(c["high"] for c in lookback)
    range_low  = min(c["low"]  for c in lookback)

    vols    = _volumes(lookback)
    avg_vol = float(np.mean(vols)) if vols.size else 0.0
    cur_vol = current["volume"]
    cur_close = current["close"]

    vol_ratio = cur_vol / avg_vol if avg_vol > 0 else 0.0

    # 2.2 — Volumen obligatorio para confirmar la ruptura
    if vol_ratio < BREAKOUT_VOL_MIN_RATIO:
        return None

    closes = _closes(candles)
    rsi_val = _rsi(closes)
    atr_val = _atr(candles)

    if cur_close > range_high:
        # 2.3 — No BULL si sobrecomprado
        if rsi_val > RSI_OVERBOUGHT:
            return None

        pct = (cur_close - range_high) / range_high if range_high > 0 else 0.0
        pct_factor = min(pct / BREAKOUT_THRESHOLD_PCT, 1.0)
        vol_factor = min((vol_ratio - 1.0) / 3.0, 1.0)
        rsi_factor = 1.0 - abs(rsi_val - 50.0) / 50.0
        confidence = 0.50 * pct_factor + 0.35 * vol_factor + 0.15 * rsi_factor

        sl, tp = _sl_tp(cur_close, atr_val, "LONG")
        rr = (tp - cur_close) / (cur_close - sl) if (cur_close - sl) > 0 else None

        return {
            "signal_type":    "BREAKOUT_BULL",
            "direction":      "LONG",
            "timeframe":      timeframe,
            "price":          cur_close,
            "breakout_level": range_high,
            "volume_ratio":   vol_ratio,
            "rsi":            rsi_val,
            "atr":            atr_val,
            "stop_loss":      sl,
            "take_profit":    tp,
            "risk_reward":    rr,
            "confidence":     round(confidence, 4),
        }

    if cur_close < range_low:
        # 2.3 — No BEAR si sobrevendido
        if rsi_val < RSI_OVERSOLD:
            return None

        pct = (range_low - cur_close) / range_low if range_low > 0 else 0.0
        pct_factor = min(pct / BREAKOUT_THRESHOLD_PCT, 1.0)
        vol_factor = min((vol_ratio - 1.0) / 3.0, 1.0)
        rsi_factor = 1.0 - abs(rsi_val - 50.0) / 50.0
        confidence = 0.50 * pct_factor + 0.35 * vol_factor + 0.15 * rsi_factor

        sl, tp = _sl_tp(cur_close, atr_val, "SHORT")
        rr = (cur_close - tp) / (sl - cur_close) if (sl - cur_close) > 0 else None

        return {
            "signal_type":    "BREAKOUT_BEAR",
            "direction":      "SHORT",
            "timeframe":      timeframe,
            "price":          cur_close,
            "breakout_level": range_low,
            "volume_ratio":   vol_ratio,
            "rsi":            rsi_val,
            "atr":            atr_val,
            "stop_loss":      sl,
            "take_profit":    tp,
            "risk_reward":    rr,
            "confidence":     round(confidence, 4),
        }

    return None


# ── 2. 1H LSRL Regression ─────────────────────────────────────────────────────

def detect_regression_signal(candles: list[dict], timeframe: str = "1H") -> Optional[dict]:
    """
    LSRL sobre los cierres de velas 1H (>=20 velas recomendado).
    Usa scipy.stats.linregress para obtener p-value y R².
    Señal solo si R² >= REGRESSION_R2_MIN y p_value < REGRESSION_PVALUE_MAX.
    """
    if len(candles) < 10:
        return None

    closes = _closes(candles)
    x = np.arange(len(closes), dtype=float)

    # 2.4 — Test de significancia estadística
    slope, intercept, r_value, p_value, std_err = scipy_stats.linregress(x, closes)
    r2 = float(r_value ** 2)

    if r2 < REGRESSION_R2_MIN or p_value > REGRESSION_PVALUE_MAX:
        return None

    slope_pct = float(slope) / closes[0] if closes[0] != 0 else 0.0
    price = float(closes[-1])

    rsi_val = _rsi(closes)
    atr_val = _atr(candles)

    # Confianza compuesta multi-factor (Tier 3.3)
    r2_factor    = (r2 - REGRESSION_R2_MIN) / max(1.0 - REGRESSION_R2_MIN, 1e-9)
    slope_factor = min(abs(slope_pct) / 0.002, 1.0)
    pval_factor  = 1.0 - float(p_value)
    confidence   = round(0.50 * r2_factor + 0.30 * slope_factor + 0.20 * pval_factor, 4)

    if slope_pct > 0.0005:
        sl, tp = _sl_tp(price, atr_val, "LONG")
        rr = (tp - price) / (price - sl) if (price - sl) > 0 else None
        return {
            "signal_type":       "REGRESSION_BULL",
            "direction":         "LONG",
            "timeframe":         timeframe,
            "price":             price,
            "regression_slope":  slope_pct,
            "regression_r2":     r2,
            "rsi":               rsi_val,
            "atr":               atr_val,
            "stop_loss":         sl,
            "take_profit":       tp,
            "risk_reward":       rr,
            "confidence":        confidence,
        }

    if slope_pct < -0.0005:
        sl, tp = _sl_tp(price, atr_val, "SHORT")
        rr = (price - tp) / (sl - price) if (sl - price) > 0 else None
        return {
            "signal_type":       "REGRESSION_BEAR",
            "direction":         "SHORT",
            "timeframe":         timeframe,
            "price":             price,
            "regression_slope":  slope_pct,
            "regression_r2":     r2,
            "rsi":               rsi_val,
            "atr":               atr_val,
            "stop_loss":         sl,
            "take_profit":       tp,
            "risk_reward":       rr,
            "confidence":        confidence,
        }

    return None


# ── 3. Volume Anomaly ─────────────────────────────────────────────────────────

def detect_volume_anomaly(candles: list[dict], timeframe: str = "15m") -> Optional[dict]:
    """
    Z-score de volumen: (vol_actual - media) / std_dev.
    Umbral: z >= VOLUME_ZSCORE_MIN (default 2.0 = percentil 97.7%).
    Usa ventana extendida (todas las velas históricas menos la última).
    """
    if len(candles) < 10:
        return None

    history  = _volumes(candles[:-1])
    mean_vol = float(np.mean(history))
    std_vol  = float(np.std(history))
    cur_vol  = candles[-1]["volume"]
    cur_close = candles[-1]["close"]

    if std_vol <= 0 or mean_vol <= 0:
        return None

    z_score = (cur_vol - mean_vol) / std_vol

    if z_score < VOLUME_ZSCORE_MIN:
        return None

    confidence = round(min(z_score / 4.0, 1.0), 4)  # z=4 → 100%
    vol_ratio  = cur_vol / mean_vol if mean_vol > 0 else 0.0

    closes  = _closes(candles)
    rsi_val = _rsi(closes)
    atr_val = _atr(candles)

    # For volume anomalies keep NEUTRAL direction; SL/TP symmetric
    sl, tp = _sl_tp(cur_close, atr_val, "NEUTRAL")
    rr = (tp - cur_close) / (cur_close - sl) if (cur_close - sl) > 0 else None

    return {
        "signal_type":  "VOLUME_ANOMALY",
        "direction":    "NEUTRAL",
        "timeframe":    timeframe,
        "price":        cur_close,
        "volume_ratio": round(vol_ratio, 4),
        "rsi":          rsi_val,
        "atr":          atr_val,
        "stop_loss":    sl,
        "take_profit":  tp,
        "risk_reward":  rr,
        "confidence":   confidence,
    }


# ── Full analysis per symbol ──────────────────────────────────────────────────

def analyze_symbol(symbol: str) -> list[dict]:
    """
    Runs all three analyses for a symbol using timeframes from ScannerConfig.
    Returns a list of signal dicts (may be empty).
    funding_rate is injected by the caller (tasks.py).
    """
    from apps.scanner.okx_client import get_candles
    from apps.scanner.models import ScannerConfig

    cfg = ScannerConfig.get()
    breakout_tf   = cfg.breakout_tf
    volume_tf     = cfg.volume_tf
    regression_tf = cfg.regression_tf

    results: list[dict] = []

    # Breakout — uses configured TF (default 15m)
    bo_candles = get_candles(symbol, breakout_tf, limit=35)
    if bo_candles and len(bo_candles) >= 20:
        sig = detect_breakout(bo_candles, timeframe=breakout_tf)
        if sig:
            sig["symbol"] = symbol
            results.append(sig)

    # Volume anomaly — uses its own configured TF (may differ from breakout)
    if volume_tf != breakout_tf:
        vol_candles = get_candles(symbol, volume_tf, limit=35)
    else:
        vol_candles = bo_candles

    if vol_candles and len(vol_candles) >= 10:
        vol_sig = detect_volume_anomaly(vol_candles, timeframe=volume_tf)
        if vol_sig:
            vol_sig["symbol"] = symbol
            results.append(vol_sig)

    # Regression — uses configured TF (default 1H)
    reg_candles = get_candles(symbol, regression_tf, limit=55)
    if reg_candles and len(reg_candles) >= 10:
        sig = detect_regression_signal(reg_candles, timeframe=regression_tf)
        if sig:
            sig["symbol"] = symbol
            results.append(sig)

    return results
