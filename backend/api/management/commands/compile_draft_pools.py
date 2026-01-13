# api/management/commands/compile_draft_pools.py
from django.core.management.base import BaseCommand
from api.models import DraftWindow, FantasyLeague, FantasySquad, IPLPlayer
from api.services.draft_window_service import build_draft_pool, resolve_draft_window

class Command(BaseCommand):
    help = 'Compiles draft pools for mid-season draft by identifying players not in core squads'

    def handle(self, *args, **options):
        leagues = FantasyLeague.objects.filter(season__status='ONGOING')
        self.stdout.write(f"Found {leagues.count()} active leagues")
        
        for league in leagues:
            self.compile_draft_pool(league)
    
    def compile_draft_pool(self, league):
        draft_window = resolve_draft_window(league, kind=DraftWindow.Kind.MID_SEASON)
        draft_pool = build_draft_pool(league, draft_window)
        draft_window.draft_pool = draft_pool
        draft_window.save(update_fields=['draft_pool'])
        
        self.stdout.write(
            f"League {league.name} (draft window {draft_window.id}): {len(draft_pool)} players in draft pool"
        )
        return draft_pool
