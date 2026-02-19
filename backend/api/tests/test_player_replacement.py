from datetime import date, timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import (
    Competition,
    FantasyLeague,
    FantasySquad,
    Player,
    PlayerSeasonTeam,
    Season,
    SeasonTeam,
    Team,
)
from api.services.player_replacement_service import apply_ruled_out_replacement


class PlayerReplacementTests(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="pass123",
        )
        self.manager_user = User.objects.create_user(
            username="manager",
            email="manager@example.com",
            password="pass123",
        )
        self.other_manager_user = User.objects.create_user(
            username="manager2",
            email="manager2@example.com",
            password="pass123",
        )

        self.competition = Competition.objects.create(
            name="IPL",
            format=Competition.Format.T20,
            grade=Competition.Grade.FRANCHISE,
        )
        self.season = Season.objects.create(
            competition=self.competition,
            year=2026,
            name="IPL 2026",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=60),
            status=Season.Status.ONGOING,
        )

        self.team_a = Team.objects.create(
            name="Team A",
            short_name="A",
            home_ground="Stadium A",
            city="City A",
            primary_color="#111111",
            secondary_color="#222222",
        )
        self.team_b = Team.objects.create(
            name="Team B",
            short_name="B",
            home_ground="Stadium B",
            city="City B",
            primary_color="#333333",
            secondary_color="#444444",
        )
        SeasonTeam.objects.create(team=self.team_a, season=self.season)
        SeasonTeam.objects.create(team=self.team_b, season=self.season)

        self.injured_player = Player.objects.create(name="Injured Player", role=Player.Role.BATSMAN)
        self.replacement_player = Player.objects.create(name="Replacement Player", role=Player.Role.BATSMAN)
        self.other_player = Player.objects.create(name="Other Player", role=Player.Role.BOWLER)

        self.league = FantasyLeague.objects.create(
            name="League",
            color="#0f172a",
            max_teams=10,
            admin=self.admin_user,
            season=self.season,
            league_code="ABCDE",
        )
        self.squad_with_injured = FantasySquad.objects.create(
            name="Squad 1",
            color="#2563eb",
            user=self.manager_user,
            league=self.league,
            current_squad=[self.injured_player.id, self.other_player.id],
        )
        self.squad_without_injured = FantasySquad.objects.create(
            name="Squad 2",
            color="#dc2626",
            user=self.other_manager_user,
            league=self.league,
            current_squad=[self.other_player.id],
        )

    def test_apply_replacement_creates_mapping_and_appends_to_squads(self):
        ruled_out_mapping = PlayerSeasonTeam.objects.create(
            player=self.injured_player,
            team=self.team_a,
            season=self.season,
            ruled_out=True,
            replacement=self.replacement_player,
        )

        result = apply_ruled_out_replacement(ruled_out_mapping)

        replacement_mapping = PlayerSeasonTeam.objects.get(
            player=self.replacement_player,
            season=self.season,
        )
        self.assertEqual(replacement_mapping.team_id, self.team_a.id)
        self.assertTrue(result["mapping_created"])
        self.assertEqual(result["squads_updated"], 1)

        self.squad_with_injured.refresh_from_db()
        self.squad_without_injured.refresh_from_db()
        self.assertIn(self.replacement_player.id, self.squad_with_injured.current_squad)
        self.assertNotIn(self.replacement_player.id, self.squad_without_injured.current_squad)

    def test_apply_replacement_is_idempotent(self):
        ruled_out_mapping = PlayerSeasonTeam.objects.create(
            player=self.injured_player,
            team=self.team_a,
            season=self.season,
            ruled_out=True,
            replacement=self.replacement_player,
        )

        first_result = apply_ruled_out_replacement(ruled_out_mapping)
        second_result = apply_ruled_out_replacement(ruled_out_mapping)

        self.squad_with_injured.refresh_from_db()
        replacement_count = self.squad_with_injured.current_squad.count(self.replacement_player.id)
        self.assertEqual(replacement_count, 1)
        self.assertEqual(first_result["squads_updated"], 1)
        self.assertEqual(second_result["squads_updated"], 0)

    def test_apply_replacement_updates_existing_mapping_team_for_same_season(self):
        PlayerSeasonTeam.objects.create(
            player=self.replacement_player,
            team=self.team_b,
            season=self.season,
        )
        ruled_out_mapping = PlayerSeasonTeam.objects.create(
            player=self.injured_player,
            team=self.team_a,
            season=self.season,
            ruled_out=True,
            replacement=self.replacement_player,
        )

        result = apply_ruled_out_replacement(ruled_out_mapping)
        replacement_mapping = PlayerSeasonTeam.objects.get(
            player=self.replacement_player,
            season=self.season,
        )

        self.assertFalse(result["mapping_created"])
        self.assertTrue(result["mapping_updated"])
        self.assertEqual(replacement_mapping.team_id, self.team_a.id)

    def test_squad_players_endpoint_returns_ruled_out_and_replacement(self):
        PlayerSeasonTeam.objects.create(
            player=self.injured_player,
            team=self.team_a,
            season=self.season,
            ruled_out=True,
            replacement=self.replacement_player,
        )
        PlayerSeasonTeam.objects.create(
            player=self.replacement_player,
            team=self.team_a,
            season=self.season,
        )

        client = APIClient()
        client.force_authenticate(self.manager_user)

        response = client.get(f"/api/squads/{self.squad_with_injured.id}/players/")
        self.assertEqual(response.status_code, 200)

        injured_payload = next(item for item in response.data if item["id"] == self.injured_player.id)
        self.assertTrue(injured_payload["ruled_out"])
        self.assertEqual(injured_payload["replacement"]["id"], self.replacement_player.id)
        self.assertEqual(injured_payload["replacement"]["name"], self.replacement_player.name)
