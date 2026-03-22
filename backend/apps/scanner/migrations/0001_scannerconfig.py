from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="ScannerConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("breakout_tf",       models.CharField(max_length=10, default="15m")),
                ("volume_tf",         models.CharField(max_length=10, default="15m")),
                ("regression_tf",     models.CharField(max_length=10, default="1H")),
                ("top_symbols_count", models.PositiveIntegerField(default=50)),
                ("min_confidence",    models.FloatField(default=0.0)),
            ],
            options={"verbose_name": "Scanner Config"},
        ),
    ]
