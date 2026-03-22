from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("signals", "0004_merge"),
    ]

    operations = [
        migrations.AddField(
            model_name="signal",
            name="repeat_count",
            field=models.PositiveIntegerField(default=1),
        ),
    ]
