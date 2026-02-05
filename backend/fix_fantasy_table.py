"""
This script can be run directly on the production server to fix the FantasyPlayerEvent table
without requiring a full deployment.

Run it with:
python fix_fantasy_table.py
"""

import os
import sys
import django
from django.db import connection, transaction

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

def fix_fantasy_event_table():
    print("Starting FantasyPlayerEvent table fixes...")
    
    with connection.cursor() as cursor:
        # Fix NULL values in boost_points
        cursor.execute("""
            UPDATE api_fantasyplayerevent 
            SET boost_points = 0
            WHERE boost_points IS NULL;
        """)
        print(f"Fixed NULL boost_points values: {cursor.rowcount} rows affected")
        
        # Check for orphaned records (where match_event is missing)
        cursor.execute("""
            SELECT COUNT(*) 
            FROM api_fantasyplayerevent fpe
            LEFT JOIN api_playermatchevent ipe ON fpe.match_event_id = ipe.id
            WHERE ipe.id IS NULL;
        """)
        orphaned_count = cursor.fetchone()[0]
        
        if orphaned_count > 0:
            print(f"Found {orphaned_count} FantasyPlayerEvents with missing match_event references")
            
            # Delete orphaned records
            with transaction.atomic():
                cursor.execute("""
                    DELETE FROM api_fantasyplayerevent
                    WHERE id IN (
                        SELECT fpe.id
                        FROM api_fantasyplayerevent fpe
                        LEFT JOIN api_playermatchevent ipe ON fpe.match_event_id = ipe.id
                        WHERE ipe.id IS NULL
                    );
                """)
                print(f"Deleted {cursor.rowcount} orphaned records")
        else:
            print("No orphaned records found")
        
        # Check for orphaned records (where fantasy_squad is missing)
        cursor.execute("""
            SELECT COUNT(*) 
            FROM api_fantasyplayerevent fpe
            LEFT JOIN api_fantasysquad fs ON fpe.fantasy_squad_id = fs.id
            WHERE fs.id IS NULL;
        """)
        orphaned_count = cursor.fetchone()[0]
        
        if orphaned_count > 0:
            print(f"Found {orphaned_count} FantasyPlayerEvents with missing fantasy_squad references")
            
            # Delete orphaned records
            with transaction.atomic():
                cursor.execute("""
                    DELETE FROM api_fantasyplayerevent
                    WHERE id IN (
                        SELECT fpe.id
                        FROM api_fantasyplayerevent fpe
                        LEFT JOIN api_fantasysquad fs ON fpe.fantasy_squad_id = fs.id
                        WHERE fs.id IS NULL
                    );
                """)
                print(f"Deleted {cursor.rowcount} orphaned records")
        else:
            print("No orphaned fantasy_squad references found")
        
        # Ensure boost_id column has proper foreign key references
        cursor.execute("""
            SELECT COUNT(*) 
            FROM api_fantasyplayerevent fpe
            LEFT JOIN api_fantasyboostrole fbr ON fpe.boost_id = fbr.id
            WHERE fpe.boost_id IS NOT NULL AND fbr.id IS NULL;
        """)
        invalid_boost_count = cursor.fetchone()[0]
        
        if invalid_boost_count > 0:
            print(f"Found {invalid_boost_count} FantasyPlayerEvents with invalid boost references")
            
            # Set invalid boost_id references to NULL
            with transaction.atomic():
                cursor.execute("""
                    UPDATE api_fantasyplayerevent
                    SET boost_id = NULL
                    WHERE id IN (
                        SELECT fpe.id
                        FROM api_fantasyplayerevent fpe
                        LEFT JOIN api_fantasyboostrole fbr ON fpe.boost_id = fbr.id
                        WHERE fpe.boost_id IS NOT NULL AND fbr.id IS NULL
                    );
                """)
                print(f"Fixed {cursor.rowcount} invalid boost references")
        else:
            print("No invalid boost references found")
    
    # Now recalculate fantasy-related points in case any data was modified
    from api.models import FantasyPlayerEvent, FantasySquad
    from django.db.models import F, Sum
    
    print("Recalculating fantasy event points...")
    for event in FantasyPlayerEvent.objects.select_related('match_event', 'boost').all():
        if event.boost:
            # For Captain (2x) and Vice Captain (1.5x) roles that apply to all points
            if event.boost.label in ['Captain', 'Vice Captain']:
                multiplier = event.boost.multiplier_runs  # All multipliers are the same for these roles
                event.boost_points = (multiplier - 1.0) * event.match_event.total_points_all
            else:
                # We won't recalculate specific boosts here as it's complex.
                # Just ensure it's not NULL
                if event.boost_points is None:
                    event.boost_points = 0
            event.save(update_fields=['boost_points'])
    
    print("Recalculating fantasy squad total points...")
    squads = FantasySquad.objects.all()
    
    for squad in squads:
        # Calculate total points from all fantasy player events
        events = FantasyPlayerEvent.objects.filter(fantasy_squad=squad)
        total_points = 0
        
        for event in events:
            event_points = event.match_event.total_points_all + event.boost_points
            total_points += event_points
        
        squad.total_points = total_points
        squad.save(update_fields=['total_points'])
    
    print("FantasyPlayerEvent fixes completed successfully!")

if __name__ == "__main__":
    fix_fantasy_event_table()
