from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("scanner", "0003_scannerconfig_reversal"),
    ]

    operations = [
        migrations.AlterField(
            model_name="scannerconfig",
            name="breakout_tf",
            field=models.CharField(
                choices=[
                    ("1m", "1 minuto"), ("3m", "3 minutos"), ("5m", "5 minutos"),
                    ("15m", "15 minutos"), ("30m", "30 minutos"), ("1H", "1 hora"),
                    ("2H", "2 horas"), ("4H", "4 horas"), ("6H", "6 horas"),
                    ("12H", "12 horas"), ("1D", "1 día"),
                ],
                default="15m",
                max_length=10,
            ),
        ),
        migrations.AlterField(
            model_name="scannerconfig",
            name="regression_tf",
            field=models.CharField(
                choices=[
                    ("1m", "1 minuto"), ("3m", "3 minutos"), ("5m", "5 minutos"),
                    ("15m", "15 minutos"), ("30m", "30 minutos"), ("1H", "1 hora"),
                    ("2H", "2 horas"), ("4H", "4 horas"), ("6H", "6 horas"),
                    ("12H", "12 horas"), ("1D", "1 día"),
                ],
                default="1H",
                max_length=10,
            ),
        ),
        migrations.AlterField(
            model_name="scannerconfig",
            name="volume_tf",
            field=models.CharField(
                choices=[
                    ("1m", "1 minuto"), ("3m", "3 minutos"), ("5m", "5 minutos"),
                    ("15m", "15 minutos"), ("30m", "30 minutos"), ("1H", "1 hora"),
                    ("2H", "2 horas"), ("4H", "4 horas"), ("6H", "6 horas"),
                    ("12H", "12 horas"), ("1D", "1 día"),
                ],
                default="15m",
                max_length=10,
            ),
        ),
    ]
