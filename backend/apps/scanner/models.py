from django.db import models


TIMEFRAME_CHOICES = [
    ("1m",  "1 minuto"),
    ("3m",  "3 minutos"),
    ("5m",  "5 minutos"),
    ("15m", "15 minutos"),
    ("30m", "30 minutos"),
    ("1H",  "1 hora"),
    ("2H",  "2 horas"),
    ("4H",  "4 horas"),
    ("6H",  "6 horas"),
    ("12H", "12 horas"),
    ("1D",  "1 día"),
]


class ScannerConfig(models.Model):
    """Singleton model — scanner configuration editable from the UI."""
    breakout_tf       = models.CharField(max_length=10, choices=TIMEFRAME_CHOICES, default="15m")
    volume_tf         = models.CharField(max_length=10, choices=TIMEFRAME_CHOICES, default="15m")
    regression_tf     = models.CharField(max_length=10, choices=TIMEFRAME_CHOICES, default="1H")
    top_symbols_count = models.PositiveIntegerField(default=50)
    min_confidence    = models.FloatField(default=0.0)

    # Auto-send to Telegram by signal type
    telegram_breakout   = models.BooleanField(default=True)
    telegram_volume     = models.BooleanField(default=False)
    telegram_regression = models.BooleanField(default=False)

    # Trend reversal filter — only send breakout if EMA crossover detected
    telegram_reversal_filter = models.BooleanField(default=False)
    ema_fast = models.PositiveIntegerField(default=9)
    ema_slow = models.PositiveIntegerField(default=21)

    # Telegram noise filters
    telegram_cooldown_minutes      = models.PositiveIntegerField(default=15)
    telegram_min_confidence_tg     = models.FloatField(default=0.0)
    # Only send regression signals when slope changed direction (alcista↔bajista)
    telegram_regression_reversal   = models.BooleanField(default=False)

    def should_telegram(self, signal_type: str, trend_reversal: bool = False) -> bool:
        if signal_type in ("BREAKOUT_BULL", "BREAKOUT_BEAR"):
            if not self.telegram_breakout:
                return False
            if self.telegram_reversal_filter and not trend_reversal:
                return False
            return True
        if signal_type == "VOLUME_ANOMALY":
            return self.telegram_volume
        if signal_type in ("REGRESSION_BULL", "REGRESSION_BEAR"):
            if not self.telegram_regression:
                return False
            # If regression reversal filter is ON, only send when slope changed direction
            if self.telegram_regression_reversal and not trend_reversal:
                return False
            return True
        return False

    class Meta:
        verbose_name = "Scanner Config"

    @classmethod
    def get(cls) -> "ScannerConfig":
        obj = cls.objects.first()
        if obj is None:
            obj = cls.objects.create()
        return obj

    def __str__(self):
        return f"ScannerConfig(breakout={self.breakout_tf}, vol={self.volume_tf}, reg={self.regression_tf})"
