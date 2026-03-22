from django.apps import AppConfig


class ScannerConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.scanner"
    label = "scanner"

    def ready(self):
        self._register_periodic_tasks()

    def _register_periodic_tasks(self):
        try:
            from django_celery_beat.models import PeriodicTask, IntervalSchedule
            from django.conf import settings

            interval_seconds = getattr(settings, "SCANNER_INTERVAL", 60)
            schedule, _ = IntervalSchedule.objects.get_or_create(
                every=interval_seconds,
                period=IntervalSchedule.SECONDS,
            )
            PeriodicTask.objects.get_or_create(
                name="scan-markets",
                defaults={
                    "task": "apps.scanner.tasks.scan_markets",
                    "interval": schedule,
                    "enabled": True,
                },
            )
        except Exception:
            pass
