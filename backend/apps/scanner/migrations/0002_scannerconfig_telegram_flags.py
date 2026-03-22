from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("scanner", "0001_scannerconfig"),
    ]

    operations = [
        migrations.AddField(
            model_name="scannerconfig",
            name="telegram_breakout",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="scannerconfig",
            name="telegram_volume",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="scannerconfig",
            name="telegram_regression",
            field=models.BooleanField(default=False),
        ),
    ]
