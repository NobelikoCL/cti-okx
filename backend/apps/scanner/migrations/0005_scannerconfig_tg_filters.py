from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("scanner", "0004_alter_scannerconfig_breakout_tf_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="scannerconfig",
            name="telegram_cooldown_minutes",
            field=models.PositiveIntegerField(default=15),
        ),
        migrations.AddField(
            model_name="scannerconfig",
            name="telegram_min_confidence_tg",
            field=models.FloatField(default=0.0),
        ),
    ]
