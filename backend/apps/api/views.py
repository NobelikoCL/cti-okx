import logging

from django.conf import settings
from django.db.models import Count
from django_filters import rest_framework as filters
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.generics import ListAPIView
from rest_framework.response import Response

from apps.signals.models import Signal
from .serializers import SignalSerializer

logger = logging.getLogger(__name__)


# ── Filters ───────────────────────────────────────────────────────────────────

class SignalFilter(filters.FilterSet):
    signal_type = filters.MultipleChoiceFilter(choices=Signal.SignalType.choices)
    from_date = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    to_date = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")
    min_confidence = filters.NumberFilter(field_name="confidence", lookup_expr="gte")
    sent = filters.BooleanFilter(field_name="is_sent_telegram")

    class Meta:
        model = Signal
        fields = ["symbol", "signal_type", "timeframe", "is_sent_telegram"]


# ── Views ─────────────────────────────────────────────────────────────────────

class SignalListView(ListAPIView):
    """
    GET /api/signals/
    List all signals with filtering, search, ordering, and pagination.
    """
    queryset = Signal.objects.all()
    serializer_class = SignalSerializer
    filterset_class = SignalFilter
    filter_backends = [filters.DjangoFilterBackend, OrderingFilter, SearchFilter]
    search_fields = ["symbol"]
    ordering_fields = ["created_at", "confidence", "symbol"]
    ordering = ["-created_at"]


@api_view(["GET"])
def signal_stats(request):
    """
    GET /api/signals/stats/
    Returns counts by signal_type and totals.
    """
    counts = (
        Signal.objects.values("signal_type")
        .annotate(count=Count("id"))
        .order_by("signal_type")
    )
    total = Signal.objects.count()
    unsent = Signal.objects.filter(is_sent_telegram=False).count()

    return Response({
        "total": total,
        "unsent_telegram": unsent,
        "by_type": {item["signal_type"]: item["count"] for item in counts},
    })


@api_view(["POST"])
def send_signal_telegram(request, pk):
    """
    POST /api/signals/<pk>/send/
    Manually trigger a Telegram send for a specific signal.
    """
    try:
        signal = Signal.objects.get(pk=pk)
    except Signal.DoesNotExist:
        return Response({"error": "Signal not found"}, status=status.HTTP_404_NOT_FOUND)

    from apps.alerts.tasks import send_telegram_alert
    send_telegram_alert.apply_async(args=[signal.id], queue="alerts")

    return Response({"status": "queued", "signal_id": pk})


@api_view(["POST"])
def send_all_unsent(request):
    """
    POST /api/signals/send-unsent/
    Queue Telegram alerts for all signals not yet sent.
    """
    from apps.alerts.tasks import send_telegram_alert
    unsent = Signal.objects.filter(is_sent_telegram=False)
    count = unsent.count()
    for sig in unsent:
        send_telegram_alert.apply_async(args=[sig.id], queue="alerts")
    return Response({"status": "queued", "count": count})


@api_view(["POST"])
def trigger_scan(request):
    """
    POST /api/scanner/run/
    Manually trigger the market scanner.
    """
    from apps.scanner.tasks import scan_markets
    task = scan_markets.apply_async(queue="scanner")
    return Response({"status": "started", "task_id": task.id})


@api_view(["GET"])
def telegram_status(request):
    """
    GET /api/telegram/status/
    Returns whether Telegram is configured (DB takes priority over settings).
    """
    from apps.alerts.telegram import _get_credentials
    token, chat_id = _get_credentials()
    configured = bool(token and chat_id)
    return Response({
        "configured": configured,
        "chat_id": chat_id if configured else "",
    })


@api_view(["POST"])
def telegram_configure(request):
    """
    POST /api/telegram/configure/
    Save bot token and chat_id to the database.
    """
    token = request.data.get("token", "").strip()
    chat_id = request.data.get("chat_id", "").strip()

    if not token or not chat_id:
        return Response(
            {"success": False, "error": "Token y chat_id son requeridos"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from apps.alerts.models import BotConfig
    BotConfig.save_credentials(token, chat_id)
    return Response({"success": True})


@api_view(["POST"])
def telegram_test(request):
    """
    POST /api/telegram/test/
    Send a test message to Telegram using provided or configured credentials.
    """
    from apps.alerts.telegram import _get_credentials
    saved_token, saved_chat_id = _get_credentials()
    token = request.data.get("token") or saved_token
    chat_id = request.data.get("chat_id") or saved_chat_id

    if not token or not chat_id:
        return Response(
            {"success": False, "error": "Token y chat_id son requeridos"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from apps.alerts.telegram import send_test_message
    ok = send_test_message(token, chat_id)
    return Response({"success": ok})


@api_view(["GET", "POST"])
def scanner_config(request):
    """
    GET  /api/config/scanner/ — returns current scanner config
    POST /api/config/scanner/ — updates scanner config
    """
    from apps.scanner.models import ScannerConfig
    cfg = ScannerConfig.get()

    if request.method == "GET":
        return Response({
            "breakout_tf":       cfg.breakout_tf,
            "volume_tf":         cfg.volume_tf,
            "regression_tf":     cfg.regression_tf,
            "top_symbols_count": cfg.top_symbols_count,
            "min_confidence":    cfg.min_confidence,
        })

    # POST — update fields
    allowed = {"breakout_tf", "volume_tf", "regression_tf", "top_symbols_count", "min_confidence"}
    for field, value in request.data.items():
        if field in allowed:
            setattr(cfg, field, value)
    cfg.save()
    return Response({"success": True})


@api_view(["GET"])
def instruments_list(request):
    """
    GET /api/instruments/
    Returns list of available USDT-SWAP instruments (cached).
    """
    from apps.scanner.okx_client import get_usdt_swap_instruments
    instruments = get_usdt_swap_instruments()
    return Response({"count": len(instruments), "instruments": instruments})
