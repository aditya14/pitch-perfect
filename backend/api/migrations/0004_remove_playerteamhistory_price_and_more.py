# Generated by Django 5.1.3 on 2024-12-25 00:21

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_remove_playerteamhistory_price_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='iplmatch',
            name='win_margin',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
