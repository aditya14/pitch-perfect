from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('api', '0040_iplmatch_phase'),  # Make sure this matches your previous migration
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            -- Fix for IPLPlayerEvent
            UPDATE api_iplplayerevent 
            SET batting_points_total = COALESCE(batting_points_total, 0), 
                bowling_points_total = COALESCE(bowling_points_total, 0), 
                fielding_points_total = COALESCE(fielding_points_total, 0), 
                other_points_total = COALESCE(other_points_total, 0), 
                total_points_all = COALESCE(total_points_all, 0) 
            WHERE batting_points_total IS NULL 
                OR bowling_points_total IS NULL 
                OR fielding_points_total IS NULL 
                OR other_points_total IS NULL 
                OR total_points_all IS NULL;
            
            -- Fix for FantasyPlayerEvent
            UPDATE api_fantasyplayerevent 
            SET boost_points = COALESCE(boost_points, 0) 
            WHERE boost_points IS NULL;
            """,
            reverse_sql="SELECT 1;",  # No-op for reverse migration
        ),
    ]
