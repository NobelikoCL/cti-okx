from django.db import migrations


class Migration(migrations.Migration):
    """Merge migration: resolves conflict between two 0007 leaf nodes."""

    dependencies = [
        ("scanner", "0007_scannerconfig_scan_interval"),
        ("scanner", "0007_scannerconfig_telegram_reversal"),
    ]

    operations = []
