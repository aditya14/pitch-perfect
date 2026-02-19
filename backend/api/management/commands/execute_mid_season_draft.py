from django.core.management.base import BaseCommand

from api.models import DraftWindow, FantasyLeague
from api.services.draft_window_service import execute_draft_window, resolve_draft_window


class Command(BaseCommand):
    help = "Executes a mid-season draft window for a league."

    def add_arguments(self, parser):
        parser.add_argument("league_id", type=int, help="League ID")
        parser.add_argument(
            "--draft_window",
            type=int,
            help="Optional draft window ID. Defaults to resolved MID_SEASON window.",
        )
        parser.add_argument("--dry_run", action="store_true", help="Simulate without saving")
        parser.add_argument(
            "--force_rerun",
            action="store_true",
            help="Allow re-running a previously executed draft window",
        )

    def handle(self, *args, **options):
        league_id = options["league_id"]
        draft_window_id = options.get("draft_window")
        dry_run = options.get("dry_run", False)
        force_rerun = options.get("force_rerun", False)

        try:
            league = FantasyLeague.objects.get(id=league_id)
        except FantasyLeague.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"League with ID {league_id} not found"))
            return

        draft_window = resolve_draft_window(
            league,
            draft_window_id=draft_window_id,
            kind=DraftWindow.Kind.MID_SEASON,
        )

        result = execute_draft_window(
            league,
            draft_window,
            dry_run=dry_run,
            force_rerun=force_rerun,
        )

        mode = "Dry run" if dry_run else "Executed"
        self.stdout.write(
            self.style.SUCCESS(
                f"{mode}: {league.name} / {draft_window.label} -> {result['squads']} squads"
            )
        )
