from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("scanner", "0002_scannerconfig_telegram_flags"),
    ]

    operations = [
        migrations.AddField(
            model_name="scannerconfig",
            name="telegram_reversal_filter",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="scannerconfig",
            name="ema_fast",
            field=models.PositiveIntegerField(default=9),
        ),
        migrations.AddField(
            model_name="scannerconfig",
            name="ema_slow",
            field=models.PositiveIntegerField(default=21),
        ),
    ]
