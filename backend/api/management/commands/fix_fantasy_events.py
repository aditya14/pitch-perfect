from django.core.management.base import BaseCommand
from django.db import connection, transaction
from api.models import FantasyPlayerEvent, FantasySquad, IPLPlayerEvent
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Fixes PostgreSQL compatibility issues with FantasyPlayerEvent'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force-recreate',
            action='store_true',
            help='Force recreation of FantasyPlayerEvent table structure'
        )

    def handle(self, *args, **options):
        force_recreate = options.get('force_recreate', False)
        
        # First verify the table structure and constraints
        self.stdout.write('Checking FantasyPlayerEvent table structure...')
        
        self.fix_null_values()
        self.check_foreign_keys()
        
        if force_recreate:
            self.recreate_fantasy_events()
        
        self.stdout.write(self.style.SUCCESS('FantasyPlayerEvent fixes applied successfully'))
    
    def fix_null_values(self):
        """Fix any NULL values in the boost_points column"""
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE api_fantasyplayerevent 
                SET boost_points = 0
                WHERE boost_points IS NULL;
            """)
            self.stdout.write(f'Fixed NULL boost_points values: {cursor.rowcount} rows affected')
    
    def check_foreign_keys(self):
        """Check and fix foreign key constraints"""
        with connection.cursor() as cursor:
            # Check for orphaned records (where match_event is missing)
            cursor.execute("""
                SELECT COUNT(*) 
                FROM api_fantasyplayerevent fpe
                LEFT JOIN api_iplplayerevent ipe ON fpe.match_event_id = ipe.id
                WHERE ipe.id IS NULL;
            """)
            orphaned_count = cursor.fetchone()[0]
            
            if orphaned_count > 0:
                self.stdout.write(self.style.WARNING(
                    f'Found {orphaned_count} FantasyPlayerEvents with missing match_event references'
                ))
                
                # Delete orphaned records
                with transaction.atomic():
                    cursor.execute("""
                        DELETE FROM api_fantasyplayerevent
                        WHERE id IN (
                            SELECT fpe.id
                            FROM api_fantasyplayerevent fpe
                            LEFT JOIN api_iplplayerevent ipe ON fpe.match_event_id = ipe.id
                            WHERE ipe.id IS NULL
                        );
                    """)
                    self.stdout.write(f'Deleted {cursor.rowcount} orphaned records')
            else:
                self.stdout.write('No orphaned records found')
            
            # Check for orphaned records (where fantasy_squad is missing)
            cursor.execute("""
                SELECT COUNT(*) 
                FROM api_fantasyplayerevent fpe
                LEFT JOIN api_fantasysquad fs ON fpe.fantasy_squad_id = fs.id
                WHERE fs.id IS NULL;
            """)
            orphaned_count = cursor.fetchone()[0]
            
            if orphaned_count > 0:
                self.stdout.write(self.style.WARNING(
                    f'Found {orphaned_count} FantasyPlayerEvents with missing fantasy_squad references'
                ))
                
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
                    self.stdout.write(f'Deleted {cursor.rowcount} orphaned records')
            else:
                self.stdout.write('No orphaned fantasy_squad references found')
    
    def recreate_fantasy_events(self):
        """Recreate the FantasyPlayerEvent records with proper PostgreSQL compatibility"""
        # First, get counts of existing records
        event_count = FantasyPlayerEvent.objects.count()
        self.stdout.write(f'Current FantasyPlayerEvent count: {event_count}')
        
        # Backup existing records if any
        backup_data = []
        if event_count > 0:
            self.stdout.write('Backing up existing FantasyPlayerEvent records...')
            for event in FantasyPlayerEvent.objects.all().select_related('match_event', 'fantasy_squad', 'boost'):
                backup_data.append({
                    'match_event_id': event.match_event_id,
                    'fantasy_squad_id': event.fantasy_squad_id,
                    'boost_id': event.boost_id,
                    'boost_points': event.boost_points
                })
            self.stdout.write(f'Backed up {len(backup_data)} records')
        
        # Now delete all records and reset sequences
        with connection.cursor() as cursor:
            cursor.execute("TRUNCATE TABLE api_fantasyplayerevent RESTART IDENTITY CASCADE;")
            self.stdout.write('Truncated api_fantasyplayerevent table')
        
        # Restore from backup
        if backup_data:
            self.stdout.write('Restoring FantasyPlayerEvent records...')
            with transaction.atomic():
                for i, data in enumerate(backup_data):
                    try:
                        FantasyPlayerEvent.objects.create(
                            match_event_id=data['match_event_id'],
                            fantasy_squad_id=data['fantasy_squad_id'],
                            boost_id=data['boost_id'],
                            boost_points=data['boost_points'] or 0
                        )
                        if (i + 1) % 100 == 0:
                            self.stdout.write(f'Restored {i + 1} of {len(backup_data)} records')
                    except Exception as e:
                        self.stderr.write(f"Error restoring record: {str(e)}")
            
            self.stdout.write(f'Restored {FantasyPlayerEvent.objects.count()} records')
        else:
            self.stdout.write('No records to restore')
