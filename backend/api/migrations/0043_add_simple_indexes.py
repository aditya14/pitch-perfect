# Create a new file: backend/api/migrations/add_simple_indexes.py

from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0042_iplmatch_phase_fantasymatchevent'),
    ]

    operations = [
        # Create simple, safe indexes
        migrations.RunSQL(
            """
            CREATE INDEX IF NOT EXISTS idx_iplplayerevent_player_match 
            ON api_iplplayerevent(player_id, match_id);
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_iplplayerevent_player_match;"
        ),
        migrations.RunSQL(
            """
            CREATE INDEX IF NOT EXISTS idx_iplplayerevent_match_points 
            ON api_iplplayerevent(match_id, total_points_all DESC);
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_iplplayerevent_match_points;"
        ),
        migrations.RunSQL(
            """
            CREATE INDEX IF NOT EXISTS idx_iplplayerevent_player_team 
            ON api_iplplayerevent(player_id, for_team_id);
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_iplplayerevent_player_team;"
        ),
    ]