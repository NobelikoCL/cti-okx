from django.contrib import admin
from .models import Signal


@admin.register(Signal)
class SignalAdmin(admin.ModelAdmin):
    list_display = (
        "symbol", "signal_type", "timeframe", "price",
        "confidence", "is_sent_telegram", "created_at",
    )
    list_filter = ("signal_type", "timeframe", "is_sent_telegram")
    search_fields = ("symbol",)
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
