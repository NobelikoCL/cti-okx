from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("scanner", "0005_scannerconfig_tg_filters"),
    ]

    operations = [
        migrations.AddField(
            model_name="scannerconfig",
            name="telegram_regression_reversal",
            field=models.BooleanField(default=False),
        ),
    ]
