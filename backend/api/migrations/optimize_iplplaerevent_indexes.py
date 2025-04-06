# Create a new file: backend/api/migrations/optimize_iplplayerevent_indexes.py

from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),  # Change this to your latest migration
    ]

    operations = [
        # Drop redundant indexes
        migrations.RunSQL(
            "DROP INDEX IF EXISTS api_iplplayerevent_player_id_2eafe6e8;",
            reverse_sql="CREATE INDEX api_iplplayerevent_player_id_2eafe6e8 ON api_iplplayerevent(player_id);"
        ),
        migrations.RunSQL(
            "DROP INDEX IF EXISTS idx_iplplayerevent_player;",
            reverse_sql="CREATE INDEX idx_iplplayerevent_player ON api_iplplayerevent(player_id);"
        ),
        migrations.RunSQL(
            "DROP INDEX IF EXISTS api_iplplayerevent_match_id_6fb606fb;",
            reverse_sql="CREATE INDEX api_iplplayerevent_match_id_6fb606fb ON api_iplplayerevent(match_id);"
        ),
        migrations.RunSQL(
            "DROP INDEX IF EXISTS idx_iplplayerevent_match;",
            reverse_sql="CREATE INDEX idx_iplplayerevent_match ON api_iplplayerevent(match_id);"
        ),
        migrations.RunSQL(
            "DROP INDEX IF EXISTS api_iplplayerevent_for_team_id_7393d60a;",
            reverse_sql="CREATE INDEX api_iplplayerevent_for_team_id_7393d60a ON api_iplplayerevent(for_team_id);"
        ),
        migrations.RunSQL(
            "DROP INDEX IF EXISTS idx_iplplayerevent_for_team;",
            reverse_sql="CREATE INDEX idx_iplplayerevent_for_team ON api_iplplayerevent(for_team_id);"
        ),
        
        # Create optimized composite indexes
        migrations.RunSQL(
            """
            CREATE INDEX idx_iplplayerevent_player_match_completed ON api_iplplayerevent(player_id, match_id) 
            INCLUDE (total_points_all, bat_runs, bat_balls, bowl_wickets, bowl_runs)
            WHERE match_id IN (SELECT id FROM api_iplmatch WHERE status = 'COMPLETED');
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_iplplayerevent_player_match_completed;"
        ),
        migrations.RunSQL(
            """
            CREATE INDEX idx_iplplayerevent_match_points ON api_iplplayerevent(match_id, total_points_all DESC)
            INCLUDE (player_id, for_team_id);
            """,
            reverse_sql="DROP INDEX IF EXISTS idx_iplplayerevent_match_points;"
        ),
    ]