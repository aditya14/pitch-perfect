# Generated by Django 5.1.3 on 2025-02-15 00:32

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0030_iplplayer_cricdata_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='iplmatch',
            name='cricdata_id',
            field=models.CharField(blank=True, max_length=60, null=True),
        ),
    ]
