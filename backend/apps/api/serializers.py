from rest_framework import serializers
from apps.signals.models import Signal


class SignalSerializer(serializers.ModelSerializer):
    direction           = serializers.CharField(source="direction", read_only=True)
    signal_type_display = serializers.CharField(source="get_signal_type_display", read_only=True)
    funding_extreme     = serializers.BooleanField(source="funding_extreme", read_only=True)

    class Meta:
        model = Signal
        fields = [
            "id",
            "symbol",
            "signal_type",
            "signal_type_display",
            "direction",
            "timeframe",
            "price",
            "breakout_level",
            "regression_slope",
            "regression_r2",
            "volume_ratio",
            # Quantitative enrichment
            "rsi",
            "atr",
            "stop_loss",
            "take_profit",
            "risk_reward",
            "funding_rate",
            "funding_extreme",
            "confidence",
            "is_sent_telegram",
            "created_at",
        ]
