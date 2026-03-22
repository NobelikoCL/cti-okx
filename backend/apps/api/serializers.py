from rest_framework import serializers
from apps.signals.models import Signal


class SignalSerializer(serializers.ModelSerializer):
    direction = serializers.CharField(source="direction", read_only=True)
    signal_type_display = serializers.CharField(source="get_signal_type_display", read_only=True)

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
            "confidence",
            "is_sent_telegram",
            "created_at",
        ]
