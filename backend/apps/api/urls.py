from django.urls import path
from . import views

urlpatterns = [
    # Signals
    path("signals/", views.SignalListView.as_view(), name="signal-list"),
    path("signals/stats/", views.signal_stats, name="signal-stats"),
    path("signals/send-unsent/", views.send_all_unsent, name="send-all-unsent"),
    path("signals/<int:pk>/send/", views.send_signal_telegram, name="send-signal"),

    # Scanner
    path("scanner/run/",    views.trigger_scan,    name="trigger-scan"),
    path("scanner/status/", views.scanner_status,  name="scanner-status"),

    # Telegram
    path("telegram/status/", views.telegram_status, name="telegram-status"),
    path("telegram/configure/", views.telegram_configure, name="telegram-configure"),
    path("telegram/test/", views.telegram_test, name="telegram-test"),

    # Scanner config
    path("config/scanner/", views.scanner_config, name="scanner-config"),

    # Instruments
    path("instruments/", views.instruments_list, name="instruments-list"),
]
