from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("signals", "0002_signal_quant_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="signal",
            name="trend_reversal",
            field=models.BooleanField(null=True, blank=True),
        ),
    ]
