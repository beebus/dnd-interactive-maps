from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("mapdata", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="location",
            name="map",
            field=models.CharField(default="underdark", max_length=50),
        )
    ]
