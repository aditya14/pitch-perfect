from __future__ import annotations

import datetime
from collections import defaultdict

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from api.models import Competition, FantasyPlayerEvent, Season, SeasonPhase, SquadPhaseBoost


class Command(BaseCommand):
    help = "Create SquadPhaseBoost assignments from FantasyPlayerEvent data."

    def add_arguments(self, parser):
        parser.add_argument("--season-id", type=int, help="Season ID to process.")
        parser.add_argument("--season-year", type=int, help="Season year (requires --competition).")
        parser.add_argument("--competition", type=str, help="Competition name (used with --season-year).")
        parser.add_argument("--league-id", type=int, help="Optional league ID to scope events.")
        parser.add_argument(
            "--strategy",
            type=str,
            choices=["most_common", "latest"],
            default="most_common",
            help="How to choose a player when multiple players appear for the same boost in a phase.",
        )
        parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing.")

    def handle(self, *args, **options):
        season = self._resolve_season(options)
        phases = list(SeasonPhase.objects.filter(season=season))
        if not phases:
            raise CommandError("No SeasonPhase rows found for this season.")

        phase_map = {p.phase: p for p in phases}

        events = FantasyPlayerEvent.objects.filter(
            match_event__match__season=season,
            boost__isnull=False,
        ).select_related(
            "match_event__match",
            "fantasy_squad",
            "boost",
        )
        league_id = options.get("league_id")
        if league_id:
            events = events.filter(fantasy_squad__league_id=league_id)

        per_group = defaultdict(lambda: defaultdict(lambda: {"count": 0, "latest": None}))
        skipped = 0

        for event in events.iterator():
            match = event.match_event.match
            phase_id = self._resolve_phase_id(match, phase_map)
            if not phase_id:
                skipped += 1
                continue

            group_key = (event.fantasy_squad_id, phase_id, event.boost_id)
            player_id = event.match_event.player_id
            stats = per_group[group_key][player_id]
            stats["count"] += 1

            match_date = match.date
            if match_date:
                if not stats["latest"] or match_date > stats["latest"]:
                    stats["latest"] = match_date

        assignments_by_squad_phase = defaultdict(dict)
        for (squad_id, phase_id, boost_id), player_stats in per_group.items():
            chosen_player_id = self._pick_player(player_stats, options["strategy"])
            assignments_by_squad_phase[(squad_id, phase_id)][boost_id] = chosen_player_id

        created = 0
        updated = 0
        unchanged = 0

        for (squad_id, phase_id), assignments_map in assignments_by_squad_phase.items():
            assignments = [
                {"boost_id": boost_id, "player_id": player_id}
                for boost_id, player_id in sorted(assignments_map.items())
            ]

            existing = SquadPhaseBoost.objects.filter(
                fantasy_squad_id=squad_id,
                phase_id=phase_id,
            ).first()

            if existing:
                if self._normalize(existing.assignments) == self._normalize(assignments):
                    unchanged += 1
                    continue
                if not options["dry_run"]:
                    existing.assignments = assignments
                    existing.save(update_fields=["assignments", "updated_at"])
                updated += 1
            else:
                if not options["dry_run"]:
                    SquadPhaseBoost.objects.create(
                        fantasy_squad_id=squad_id,
                        phase_id=phase_id,
                        assignments=assignments,
                    )
                created += 1

        summary = (
            f"Season {season.id}: created={created}, updated={updated}, "
            f"unchanged={unchanged}, skipped_events={skipped}"
        )
        if options["dry_run"]:
            self.stdout.write(self.style.WARNING(f"[DRY RUN] {summary}"))
        else:
            self.stdout.write(self.style.SUCCESS(summary))

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

    def _resolve_phase_id(self, match, phase_map):
        if match.season_phase_id:
            return match.season_phase_id
        phase_num = match.phase
        phase = phase_map.get(phase_num)
        return phase.id if phase else None

    def _pick_player(self, player_stats, strategy):
        def sort_key(item):
            player_id, stats = item
            latest = stats["latest"] or datetime.datetime.min.replace(tzinfo=timezone.utc)
            if strategy == "latest":
                return (latest, stats["count"])
            return (stats["count"], latest)

        return max(player_stats.items(), key=sort_key)[0]

    def _normalize(self, assignments):
        normalized = []
        for item in assignments or []:
            normalized.append({
                "boost_id": item.get("boost_id"),
                "player_id": item.get("player_id"),
            })
        return sorted(normalized, key=lambda x: (x["boost_id"] or 0, x["player_id"] or 0))
