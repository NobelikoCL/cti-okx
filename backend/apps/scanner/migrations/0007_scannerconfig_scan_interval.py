from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("scanner", "0006_scannerconfig_regression_reversal"),
    ]

    operations = [
        migrations.AddField(
            model_name="scannerconfig",
            name="scan_interval_minutes",
            field=models.PositiveIntegerField(default=15),
        ),
    ]
