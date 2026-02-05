import os

import requests
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

from api.models import (
    Competition,
    CompetitionTeam,
    Player,
    PlayerSeasonTeam,
    Season,
    SeasonTeam,
    Team,
)


DEFAULT_SERIES_ID = "0cdf6736-ad9b-4e95-a647-5ee3a99c5510"
DEFAULT_BASE_URL = "https://api.cricapi.com/v1"
DEFAULT_PRIMARY_COLOR = "#1F2937"
DEFAULT_SECONDARY_COLOR = "#9CA3AF"


class _DryRunRollback(Exception):
    pass


class Command(BaseCommand):
    help = "Import teams and players from CricAPI series_squad and map them to a season."

    def add_arguments(self, parser):
        parser.add_argument(
            "--series-id",
            default=DEFAULT_SERIES_ID,
            help=f"CricAPI series id (default: {DEFAULT_SERIES_ID})",
        )
        parser.add_argument(
            "--api-key",
            default=None,
            help="CricAPI key. Defaults to CRICDATA_API_KEY env or settings.CRICDATA_API_KEY.",
        )
        parser.add_argument(
            "--competition",
            default="T20 World Cup",
            help="Competition name to map imported squads into.",
        )
        parser.add_argument(
            "--year",
            type=int,
            default=2026,
            help="Season year to map imported squads into.",
        )
        parser.add_argument(
            "--base-url",
            default=DEFAULT_BASE_URL,
            help="CricAPI base url.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Fetch and simulate import, then rollback changes.",
        )

    def handle(self, *args, **options):
        api_key = self._resolve_api_key(options.get("api_key"))
        series_id = options["series_id"]
        competition_name = options["competition"]
        season_year = options["year"]
        base_url = options["base_url"].rstrip("/")
        dry_run = options["dry_run"]

        competition = Competition.objects.filter(name=competition_name).first()
        if not competition:
            raise CommandError(f"Competition not found: {competition_name}")

        season = Season.objects.filter(competition=competition, year=season_year).first()
        if not season:
            raise CommandError(
                f"Season not found for competition='{competition_name}' and year={season_year}"
            )

        squad_data = self._fetch_series_squads(
            base_url=base_url,
            api_key=api_key,
            series_id=series_id,
        )
        self._reset_pk_sequences()

        summary = {
            "teams_created": 0,
            "teams_updated": 0,
            "competition_team_links_created": 0,
            "season_team_links_created": 0,
            "players_created": 0,
            "players_updated": 0,
            "player_season_links_created": 0,
            "player_season_links_updated": 0,
            "players_skipped_ambiguous": 0,
            "players_skipped_missing_id_or_name": 0,
        }

        try:
            with transaction.atomic():
                self._import_squads(
                    squad_data=squad_data,
                    competition=competition,
                    season=season,
                    summary=summary,
                )
                if dry_run:
                    raise _DryRunRollback()
        except _DryRunRollback:
            self.stdout.write(self.style.WARNING("Dry run complete. Database changes were rolled back."))

        self.stdout.write(self.style.SUCCESS("Import finished."))
        for key, value in summary.items():
            self.stdout.write(f"- {key}: {value}")

    def _resolve_api_key(self, cli_key):
        return (
            cli_key
            or os.getenv("CRICDATA_API_KEY")
            or getattr(settings, "CRICDATA_API_KEY", None)
        ) or self._raise_no_api_key()

    def _raise_no_api_key(self):
        raise CommandError("Missing API key. Pass --api-key or set CRICDATA_API_KEY.")

    def _fetch_series_squads(self, base_url, api_key, series_id):
        url = f"{base_url}/series_squad"
        params = {"apikey": api_key, "id": series_id}

        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
        except requests.RequestException as exc:
            raise CommandError(f"Failed to fetch series_squad: {exc}") from exc

        payload = response.json()
        data = payload.get("data")
        if not isinstance(data, list):
            message = payload.get("message", "Unexpected response: missing data list")
            raise CommandError(f"CricAPI returned invalid payload: {message}")

        return data

    def _import_squads(self, squad_data, competition, season, summary):
        for team_entry in squad_data:
            team_name = (team_entry.get("teamName") or "").strip()
            short_name = (team_entry.get("shortname") or "").strip()
            players = team_entry.get("players") or []

            if not team_name:
                continue

            team, created, updated = self._get_or_create_team(team_name=team_name, short_name=short_name)
            if created:
                summary["teams_created"] += 1
            elif updated:
                summary["teams_updated"] += 1

            _, comp_link_created = CompetitionTeam.objects.get_or_create(
                competition=competition,
                team=team,
            )
            if comp_link_created:
                summary["competition_team_links_created"] += 1

            _, season_link_created = SeasonTeam.objects.get_or_create(
                season=season,
                team=team,
            )
            if season_link_created:
                summary["season_team_links_created"] += 1

            for player_entry in players:
                cricdata_id = (player_entry.get("id") or "").strip()
                player_name = (player_entry.get("name") or "").strip()
                if not cricdata_id or not player_name:
                    summary["players_skipped_missing_id_or_name"] += 1
                    continue

                player, created, updated, ambiguous = self._get_or_create_player(
                    cricdata_id=cricdata_id,
                    player_name=player_name,
                    nationality=team_name,
                    api_role=player_entry.get("role"),
                )

                if ambiguous:
                    summary["players_skipped_ambiguous"] += 1
                    continue
                if created:
                    summary["players_created"] += 1
                elif updated:
                    summary["players_updated"] += 1

                mapping, mapping_created = PlayerSeasonTeam.objects.get_or_create(
                    player=player,
                    season=season,
                    defaults={"team": team},
                )
                if mapping_created:
                    summary["player_season_links_created"] += 1
                elif mapping.team_id != team.id:
                    mapping.team = team
                    mapping.save(update_fields=["team", "updated_at"])
                    summary["player_season_links_updated"] += 1

    def _get_or_create_team(self, team_name, short_name):
        normalized_short_name = (short_name or team_name[:5]).upper()[:5]
        team = Team.objects.filter(name__iexact=team_name).first()
        created = False
        updated = False

        if not team:
            team = Team.objects.create(
                name=team_name,
                short_name=normalized_short_name,
                home_ground="NA",
                city="NA",
                primary_color=DEFAULT_PRIMARY_COLOR,
                secondary_color=DEFAULT_SECONDARY_COLOR,
                is_active=True,
            )
            created = True
            return team, created, updated

        update_fields = []
        if normalized_short_name and team.short_name != normalized_short_name:
            team.short_name = normalized_short_name
            update_fields.append("short_name")
        if not team.is_active:
            team.is_active = True
            update_fields.append("is_active")

        if update_fields:
            team.save(update_fields=update_fields + ["updated_at"])
            updated = True

        return team, created, updated

    def _get_or_create_player(self, cricdata_id, player_name, nationality, api_role=None):
        player = Player.objects.filter(cricdata_id=cricdata_id).first()
        created = False
        updated = False
        ambiguous = False
        mapped_role = self._map_api_role(api_role)

        if not player:
            by_name = list(Player.objects.filter(name__iexact=player_name))
            if len(by_name) > 1:
                matching_nationality = [
                    p for p in by_name if (p.nationality or "").lower() == nationality.lower()
                ]
                if len(matching_nationality) == 1:
                    player = matching_nationality[0]
                elif len(matching_nationality) > 1:
                    ambiguous = True
                else:
                    ambiguous = True
            elif len(by_name) == 1:
                player = by_name[0]

        if ambiguous:
            return None, created, updated, ambiguous

        if not player:
            player = Player.objects.create(
                name=player_name,
                nationality=nationality,
                role=mapped_role,
                batting_style=None,
                bowling_style=None,
                cricdata_id=cricdata_id,
                is_active=True,
            )
            created = True
            return player, created, updated, ambiguous

        update_fields = []
        if not player.cricdata_id:
            player.cricdata_id = cricdata_id
            update_fields.append("cricdata_id")
        if not player.is_active:
            player.is_active = True
            update_fields.append("is_active")
        if player.role is None and mapped_role is not None:
            player.role = mapped_role
            update_fields.append("role")

        if update_fields:
            player.save(update_fields=update_fields + ["updated_at"])
            updated = True

        return player, created, updated, ambiguous

    def _map_api_role(self, api_role):
        role_value = (api_role or "").strip().lower()
        if role_value == "batsman":
            return Player.Role.BATSMAN
        if role_value == "bowler":
            return Player.Role.BOWLER
        if role_value in {"bowling allrounder", "batting allrounder"}:
            return Player.Role.ALL_ROUNDER
        if role_value == "wk-batsman":
            return Player.Role.WICKET_KEEPER
        return None

    def _reset_pk_sequences(self):
        # Some local/dev DBs have stale sequences after manual imports.
        if connection.vendor != "postgresql":
            return

        models_to_reset = [Team, Player, SeasonTeam, PlayerSeasonTeam, CompetitionTeam]
        with connection.cursor() as cursor:
            for model in models_to_reset:
                table = model._meta.db_table
                pk_column = model._meta.pk.column
                cursor.execute(
                    f"""
                    SELECT setval(
                        pg_get_serial_sequence(%s, %s),
                        COALESCE((SELECT MAX("{pk_column}") + 1 FROM "{table}"), 1),
                        false
                    );
                    """,
                    [table, pk_column],
                )
