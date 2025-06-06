# Generated by Django 5.1.3 on 2025-02-03 23:07

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0020_fantasyleague_draft_completed'),
    ]

    operations = [
        migrations.CreateModel(
            name='FantasyDraftOrder',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[('Pre-Season', 'Pre-Season'), ('Mid-Season', 'Mid-Season')], max_length=10)),
                ('order', models.JSONField(default=list)),
                ('league', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='draft_order', to='api.fantasyleague')),
                ('squad', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='draft_order', to='api.fantasysquad')),
            ],
            options={
                'indexes': [models.Index(fields=['league'], name='api_fantasy_league__a5eb74_idx'), models.Index(fields=['squad'], name='api_fantasy_squad_i_a037b6_idx'), models.Index(fields=['type'], name='api_fantasy_type_5cb06b_idx')],
            },
        ),
    ]
