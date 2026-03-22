from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("signals", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="signal",
            name="rsi",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="signal",
            name="atr",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="signal",
            name="stop_loss",
            field=models.DecimalField(blank=True, decimal_places=8, max_digits=24, null=True),
        ),
        migrations.AddField(
            model_name="signal",
            name="take_profit",
            field=models.DecimalField(blank=True, decimal_places=8, max_digits=24, null=True),
        ),
        migrations.AddField(
            model_name="signal",
            name="risk_reward",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="signal",
            name="funding_rate",
            field=models.FloatField(blank=True, null=True),
        ),
    ]
