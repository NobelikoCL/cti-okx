from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Signal",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("symbol", models.CharField(db_index=True, max_length=50)),
                ("signal_type", models.CharField(
                    choices=[
                        ("BREAKOUT_BULL", "Ruptura Alcista (M15)"),
                        ("BREAKOUT_BEAR", "Ruptura Bajista (M15)"),
                        ("REGRESSION_BULL", "Regresión Alcista (1H)"),
                        ("REGRESSION_BEAR", "Regresión Bajista (1H)"),
                        ("VOLUME_ANOMALY", "Anomalía de Volumen"),
                    ],
                    db_index=True,
                    max_length=20,
                )),
                ("timeframe", models.CharField(max_length=10)),
                ("price", models.DecimalField(decimal_places=8, max_digits=24)),
                ("breakout_level", models.DecimalField(blank=True, decimal_places=8, max_digits=24, null=True)),
                ("regression_slope", models.FloatField(blank=True, null=True)),
                ("regression_r2", models.FloatField(blank=True, null=True)),
                ("volume_ratio", models.FloatField(blank=True, null=True)),
                ("confidence", models.FloatField(default=0.0)),
                ("is_sent_telegram", models.BooleanField(db_index=True, default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="signal",
            index=models.Index(fields=["symbol", "signal_type", "created_at"], name="signals_sig_symbol_idx"),
        ),
    ]
