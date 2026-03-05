from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from api.models import Season
from api.services.draft_window_service import materialize_locked_phase_boosts_for_season


class Command(BaseCommand):
    help = (
        "Materialize SquadPhaseBoost assignments for locked phases "
        "so retention data exists before draft execution."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--season-id",
            type=int,
            help="Optional season id. If omitted, processes all active seasons.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be synced without writing changes.",
        )

    def handle(self, *args, **options):
        season_id = options.get("season_id")
        dry_run = bool(options.get("dry_run"))
        now_ts = timezone.now()

        if season_id:
            seasons = list(Season.objects.filter(id=season_id))
            if not seasons:
                raise CommandError(f"Season {season_id} not found.")
        else:
            seasons = list(
                Season.objects.filter(
                    status__in=[
                        Season.Status.UPCOMING,
                        Season.Status.ONGOING,
                    ]
                )
            )

        if not seasons:
            self.stdout.write("No seasons to process.")
            return

        grand_total = {
            "checked": 0,
            "created": 0,
            "filled": 0,
            "already_set": 0,
        }

        for season in seasons:
            if dry_run:
                self.stdout.write(
                    self.style.WARNING(
                        f"[DRY RUN] Would sync locked phase boosts for season {season.id} ({season.name}) at {now_ts}."
                    )
                )
                continue

            summary = materialize_locked_phase_boosts_for_season(season, now=now_ts)
            grand_total["checked"] += summary["checked"]
            grand_total["created"] += summary["created"]
            grand_total["filled"] += summary["filled"]
            grand_total["already_set"] += summary["already_set"]

            self.stdout.write(
                self.style.SUCCESS(
                    f"Season {season.id} ({season.name}): "
                    f"checked={summary['checked']}, "
                    f"created={summary['created']}, "
                    f"filled={summary['filled']}, "
                    f"already_set={summary['already_set']}"
                )
            )

        if not dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    "Done. "
                    f"checked={grand_total['checked']}, "
                    f"created={grand_total['created']}, "
                    f"filled={grand_total['filled']}, "
                    f"already_set={grand_total['already_set']}"
                )
            )
