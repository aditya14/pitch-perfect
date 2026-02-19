from django.db import transaction

from api.models import FantasySquad, PlayerSeasonTeam


def apply_ruled_out_replacement(player_season_team):
    """
    Ensure replacement PlayerSeasonTeam mapping exists for the same season/team
    and append replacement player to all squads that currently include
    the ruled-out player.
    """
    if not (
        player_season_team
        and player_season_team.ruled_out
        and player_season_team.replacement_id
        and player_season_team.season_id
        and player_season_team.team_id
    ):
        return {
            "mapping_created": False,
            "mapping_updated": False,
            "squads_updated": 0,
        }

    mapping_created = False
    mapping_updated = False
    squads_updated = 0

    with transaction.atomic():
        replacement_mapping, mapping_created = PlayerSeasonTeam.objects.get_or_create(
            player_id=player_season_team.replacement_id,
            season_id=player_season_team.season_id,
            defaults={"team_id": player_season_team.team_id},
        )

        if not mapping_created and replacement_mapping.team_id != player_season_team.team_id:
            replacement_mapping.team_id = player_season_team.team_id
            replacement_mapping.save(update_fields=["team"])
            mapping_updated = True

        squads = FantasySquad.objects.filter(
            league__season_id=player_season_team.season_id
        ).only("id", "current_squad")

        ruled_out_player_id = player_season_team.player_id
        replacement_player_id = player_season_team.replacement_id

        for squad in squads:
            current_squad = list(squad.current_squad or [])
            if ruled_out_player_id not in current_squad:
                continue
            if replacement_player_id in current_squad:
                continue

            current_squad.append(replacement_player_id)
            squad.current_squad = current_squad
            squad.save(update_fields=["current_squad"])
            squads_updated += 1

    return {
        "mapping_created": mapping_created,
        "mapping_updated": mapping_updated,
        "squads_updated": squads_updated,
    }
