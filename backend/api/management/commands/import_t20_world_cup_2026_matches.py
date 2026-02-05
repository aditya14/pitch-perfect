import csv
import io
from datetime import datetime, timezone as dt_timezone

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.utils import timezone

from api.models import Match, Season, SeasonPhase, Team


SCHEDULE_CSV = """MatchNo,Stage,Team1,Team2,Date,Time,City,Phase
1,GROUP,Pakistan,Netherlands,2/7/2026,5:30,Colombo,1
2,GROUP,West Indies,Scotland,2/7/2026,9:30,Kolkata,1
3,GROUP,India,United States of America,2/7/2026,13:30,Mumbai,1
4,GROUP,New Zealand,Afghanistan,2/8/2026,5:30,Chennai,1
5,GROUP,England,Nepal,2/8/2026,9:30,Mumbai,1
6,GROUP,Sri Lanka,Ireland,2/8/2026,13:30,Colombo,1
7,GROUP,Scotland,Italy,2/9/2026,5:30,Kolkata,1
8,GROUP,Zimbabwe,Oman,2/9/2026,9:30,Colombo,1
9,GROUP,South Africa,Canada,2/9/2026,13:30,Ahmedabad,1
10,GROUP,Netherlands,Namibia,2/10/2026,5:30,Delhi,1
11,GROUP,New Zealand,United Arab Emirates,2/10/2026,9:30,Chennai,1
12,GROUP,Pakistan,United States of America,2/10/2026,13:30,Colombo,1
13,GROUP,South Africa,Afghanistan,2/11/2026,5:30,Ahmedabad,1
14,GROUP,Australia,Ireland,2/11/2026,9:30,Colombo,1
15,GROUP,England,West Indies,2/11/2026,13:30,Mumbai,1
16,GROUP,Sri Lanka,Oman,2/12/2026,5:30,Kandy,1
17,GROUP,Nepal,Italy,2/12/2026,9:30,Mumbai,1
18,GROUP,India,Namibia,2/12/2026,13:30,Delhi,1
19,GROUP,Australia,Zimbabwe,2/13/2026,5:30,Colombo,1
20,GROUP,Canada,United Arab Emirates,2/13/2026,9:30,Delhi,1
21,GROUP,United States of America,Netherlands,2/13/2026,13:30,Chennai,1
22,GROUP,Ireland,Oman,2/14/2026,5:30,Colombo,2
23,GROUP,England,Scotland,2/14/2026,9:30,Kolkata,2
24,GROUP,New Zealand,South Africa,2/14/2026,13:30,Ahmedabad,2
25,GROUP,West Indies,Nepal,2/15/2026,5:30,Mumbai,2
26,GROUP,United States of America,Namibia,2/15/2026,9:30,Chennai,2
27,GROUP,India,Pakistan,2/15/2026,13:30,Colombo,2
28,GROUP,Afghanistan,United Arab Emirates,2/16/2026,5:30,Delhi,2
29,GROUP,England,Italy,2/16/2026,9:30,Kolkata,2
30,GROUP,Australia,Sri Lanka,2/16/2026,13:30,Kandy,2
31,GROUP,New Zealand,Canada,2/17/2026,5:30,Chennai,2
32,GROUP,Ireland,Zimbabwe,2/17/2026,9:30,Kandy,2
33,GROUP,Scotland,Nepal,2/17/2026,13:30,Mumbai,2
34,GROUP,South Africa,United Arab Emirates,2/18/2026,5:30,Delhi,2
35,GROUP,Pakistan,Namibia,2/18/2026,9:30,Colombo,2
36,GROUP,India,Netherlands,2/18/2026,13:30,Ahmedabad,2
37,GROUP,West Indies,Italy,2/19/2026,5:30,Kolkata,2
38,GROUP,Sri Lanka,Zimbabwe,2/19/2026,9:30,Colombo,2
39,GROUP,Afghanistan,Canada,2/19/2026,13:30,Chennai,2
40,GROUP,Australia,Oman,2/20/2026,13:30,Kandy,2
41,SUPER_SIXES,TBD,TBD,2/21/2026,13:30,Colombo,3
42,SUPER_SIXES,TBD,TBD,2/22/2026,9:30,Kandy,3
43,SUPER_SIXES,TBD,TBD,2/22/2026,13:30,Ahmedabad,3
44,SUPER_SIXES,TBD,TBD,2/23/2026,13:30,Mumbai,3
45,SUPER_SIXES,TBD,TBD,2/24/2026,13:30,Kandy,3
46,SUPER_SIXES,TBD,TBD,2/25/2026,13:30,Colombo,3
47,SUPER_SIXES,TBD,TBD,2/26/2026,9:30,Ahmedabad,3
48,SUPER_SIXES,TBD,TBD,2/26/2026,13:30,Chennai,3
49,SUPER_SIXES,TBD,TBD,2/27/2026,13:30,Colombo,3
50,SUPER_SIXES,TBD,TBD,2/28/2026,13:30,Kandy,3
51,SUPER_SIXES,TBD,TBD,3/1/2026,9:30,Delhi,3
52,SUPER_SIXES,TBD,TBD,3/1/2026,13:30,Kolkata,3
53,SEMI_FINAL,TBD,TBD,3/4/2026,13:30,Kolkata,4
54,SEMI_FINAL,TBD,TBD,3/5/2026,13:30,Mumbai,4
55,FINAL,TBD,TBD,3/8/2026,13:30,Ahmedabad,4
"""


class _DryRunRollback(Exception):
    pass


class Command(BaseCommand):
    help = "Import the 2026 T20 World Cup schedule into Match records."

    def add_arguments(self, parser):
        parser.add_argument(
            "--season-name",
            default="T20 World Cup 2026",
            help="Season name to import matches into.",
        )
        parser.add_argument(
            "--competition",
            default="T20 World Cup",
            help="Fallback competition name if season lookup by name fails.",
        )
        parser.add_argument(
            "--year",
            type=int,
            default=2026,
            help="Fallback season year if season lookup by name fails.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and validate but rollback DB changes.",
        )

    def handle(self, *args, **options):
        season_name = options["season_name"]
        competition_name = options["competition"]
        year = options["year"]
        dry_run = options["dry_run"]

        season = Season.objects.filter(name__iexact=season_name).first()
        if not season:
            season = Season.objects.filter(
                competition__name__iexact=competition_name,
                year=year,
            ).first()
        if not season:
            raise CommandError(
                f"Season not found by name='{season_name}' or competition='{competition_name}' and year={year}"
            )

        phase_map = {
            phase.phase: phase
            for phase in SeasonPhase.objects.filter(season=season)
        }

        rows = list(csv.DictReader(io.StringIO(SCHEDULE_CSV)))
        self._reset_match_pk_sequence()
        summary = {
            "created": 0,
            "updated": 0,
        }

        try:
            with transaction.atomic():
                for row in rows:
                    self._upsert_match(row=row, season=season, phase_map=phase_map, summary=summary)
                if dry_run:
                    raise _DryRunRollback()
        except _DryRunRollback:
            self.stdout.write(self.style.WARNING("Dry run complete. Changes were rolled back."))

        self.stdout.write(self.style.SUCCESS("Schedule import complete."))
        self.stdout.write(f"- created: {summary['created']}")
        self.stdout.write(f"- updated: {summary['updated']}")

    def _upsert_match(self, row, season, phase_map, summary):
        match_number = int(row["MatchNo"])
        stage = self._map_stage(row["Stage"])
        phase_number = int(row["Phase"])
        season_phase = phase_map.get(phase_number)
        if not season_phase:
            raise CommandError(
                f"Missing SeasonPhase for phase={phase_number} in season '{season.name}'."
            )

        team_1 = self._resolve_team(row["Team1"])
        team_2 = self._resolve_team(row["Team2"])
        match_date = self._parse_utc_datetime(row["Date"], row["Time"])

        defaults = {
            "stage": stage,
            "phase": phase_number,
            "season_phase": season_phase,
            "team_1": team_1,
            "team_2": team_2,
            "date": match_date,
            "venue": row["City"].strip(),
            "status": Match.Status.SCHEDULED,
            "toss_winner": None,
            "toss_decision": None,
            "winner": None,
            "win_margin": None,
            "win_type": None,
            "player_of_match": None,
            "inns_1_runs": None,
            "inns_1_wickets": None,
            "inns_1_overs": None,
            "inns_2_runs": None,
            "inns_2_wickets": None,
            "inns_2_overs": None,
        }

        _, created = Match.objects.update_or_create(
            season=season,
            match_number=match_number,
            defaults=defaults,
        )
        if created:
            summary["created"] += 1
        else:
            summary["updated"] += 1

    def _resolve_team(self, team_name):
        name = (team_name or "").strip()
        if not name or name.upper() == "TBD":
            return None

        team = Team.objects.filter(name__iexact=name).first()
        if team:
            return team

        team = Team.objects.filter(short_name__iexact=name).first()
        if team:
            return team

        raise CommandError(f"Team not found for schedule import: '{name}'")

    def _map_stage(self, stage_label):
        normalized = (stage_label or "").strip().upper()
        if normalized in Match.Stage.values:
            return normalized

        # Backward compatibility if a deployment still uses older stage choices.
        legacy_mapping = {
            "GROUP": Match.Stage.LEAGUE,
            "SUPER_SIXES": Match.Stage.QUALIFIER,
            "SEMI_FINAL": Match.Stage.SEMI_FINAL,
            "FINAL": Match.Stage.FINAL,
        }
        mapped = legacy_mapping.get(normalized)
        if mapped is None:
            raise CommandError(f"Unsupported stage label: '{stage_label}'")
        return mapped

    def _parse_utc_datetime(self, date_str, time_str):
        naive = datetime.strptime(
            f"{date_str.strip()} {time_str.strip()}",
            "%m/%d/%Y %H:%M",
        )
        if settings.USE_TZ:
            return timezone.make_aware(naive, dt_timezone.utc)
        return naive

    def _reset_match_pk_sequence(self):
        if connection.vendor != "postgresql":
            return
        table = Match._meta.db_table
        pk_column = Match._meta.pk.column
        with connection.cursor() as cursor:
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
