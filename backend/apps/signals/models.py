from django.db import models


class Signal(models.Model):
    class SignalType(models.TextChoices):
        BREAKOUT_BULL = "BREAKOUT_BULL", "Ruptura Alcista (M15)"
        BREAKOUT_BEAR = "BREAKOUT_BEAR", "Ruptura Bajista (M15)"
        REGRESSION_BULL = "REGRESSION_BULL", "Regresión Alcista (1H)"
        REGRESSION_BEAR = "REGRESSION_BEAR", "Regresión Bajista (1H)"
        VOLUME_ANOMALY = "VOLUME_ANOMALY", "Anomalía de Volumen"

    symbol = models.CharField(max_length=50, db_index=True)
    signal_type = models.CharField(
        max_length=20, choices=SignalType.choices, db_index=True
    )
    timeframe = models.CharField(max_length=10)
    price = models.DecimalField(max_digits=24, decimal_places=8)

    # Breakout fields
    breakout_level = models.DecimalField(
        max_digits=24, decimal_places=8, null=True, blank=True
    )

    # Regression fields
    regression_slope = models.FloatField(null=True, blank=True)
    regression_r2 = models.FloatField(null=True, blank=True)

    # Volume field
    volume_ratio = models.FloatField(null=True, blank=True)

    confidence = models.FloatField(default=0.0)
    is_sent_telegram = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["symbol", "signal_type", "created_at"]),
        ]

    def __str__(self):
        return f"{self.symbol} | {self.signal_type} | {self.created_at:%Y-%m-%d %H:%M}"

    @property
    def direction(self):
        if "BULL" in self.signal_type:
            return "LONG"
        if "BEAR" in self.signal_type:
            return "SHORT"
        return "NEUTRAL"
