from __future__ import annotations

import datetime

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from api.models import Competition, IPLMatch, Season, SeasonPhase


class Command(BaseCommand):
    help = "Create SeasonPhase records based on existing match.phase values and assign matches."

    def add_arguments(self, parser):
        parser.add_argument("--season-id", type=int, help="Season ID to process.")
        parser.add_argument("--season-year", type=int, help="Season year (requires --competition).")
        parser.add_argument("--competition", type=str, help="Competition name (used with --season-year).")
        parser.add_argument("--label-prefix", type=str, default="Week", help="Prefix for phase labels.")
        parser.add_argument("--open-offset-days", type=int, default=0, help="Days before phase start to open boosts.")
        parser.add_argument("--lock-offset-days", type=int, default=0, help="Days before phase start to lock boosts.")
        parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing.")
        parser.add_argument("--skip-assign", action="store_true", help="Do not assign matches to phases.")

    def handle(self, *args, **options):
        season = self._resolve_season(options)
        matches = IPLMatch.objects.filter(season=season).exclude(phase__isnull=True)
        if not matches.exists():
            raise CommandError("No matches found for the season with a phase value.")

        phases = sorted(set(matches.values_list("phase", flat=True)))
        created = 0
        updated = 0
        assigned = 0

        for phase_num in phases:
            phase_matches = matches.filter(phase=phase_num).exclude(date__isnull=True)
            if not phase_matches.exists():
                self.stdout.write(self.style.WARNING(f"Phase {phase_num}: no dated matches; skipping."))
                continue

            start_dt = phase_matches.order_by("date").first().date
            end_dt = phase_matches.order_by("-date").first().date
            if timezone.is_aware(start_dt):
                start_dt = timezone.localtime(start_dt)
            if timezone.is_aware(end_dt):
                end_dt = timezone.localtime(end_dt)

            start_date = start_dt.date() if isinstance(start_dt, datetime.datetime) else start_dt
            end_date = end_dt.date() if isinstance(end_dt, datetime.datetime) else end_dt

            start_at = self._to_aware(start_date, datetime.time.min)
            end_at = self._to_aware(end_date, datetime.time.max.replace(microsecond=0))

            open_at = start_at - datetime.timedelta(days=options["open_offset_days"])
            lock_at = start_at - datetime.timedelta(days=options["lock_offset_days"])

            label = f"{options['label_prefix']} {phase_num}"
            if options["dry_run"]:
                self.stdout.write(f"[DRY RUN] Phase {phase_num}: {label} {start_at} - {end_at}")
                continue

            phase_obj, created_flag = SeasonPhase.objects.update_or_create(
                season=season,
                phase=phase_num,
                defaults={
                    "label": label,
                    "open_at": open_at,
                    "lock_at": lock_at,
                    "start": start_at,
                    "end": end_at,
                },
            )
            if created_flag:
                created += 1
            else:
                updated += 1

            if not options["skip_assign"]:
                assigned_count = phase_matches.update(season_phase=phase_obj)
                assigned += assigned_count

        if options["dry_run"]:
            return

        self.stdout.write(self.style.SUCCESS(
            f"Season {season.id} processed. Phases created: {created}, updated: {updated}, matches assigned: {assigned}."
        ))

    def _resolve_season(self, options) -> Season:
        season_id = options.get("season_id")
        if season_id:
            return Season.objects.get(id=season_id)

        year = options.get("season_year")
        competition_name = options.get("competition")
        if year is None or not competition_name:
            raise CommandError("Provide --season-id or both --season-year and --competition.")

        competition = Competition.objects.filter(name=competition_name).first()
        if not competition:
            raise CommandError(f"Competition '{competition_name}' not found.")

        season = Season.objects.filter(year=year, competition=competition).first()
        if not season:
            raise CommandError(f"Season {year} for competition '{competition_name}' not found.")

        return season

    def _to_aware(self, date_value: datetime.date, time_value: datetime.time) -> datetime.datetime:
        naive = datetime.datetime.combine(date_value, time_value)
        if timezone.is_aware(naive):
            return naive
        return timezone.make_aware(naive, timezone.get_current_timezone())
