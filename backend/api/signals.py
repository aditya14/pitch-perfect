import logging

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from .models import Match, FantasyLeague
from .services.stats_service import update_fantasy_stats


logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Match)
def match_pre_save(sender, instance, **kwargs):
    """
    Snapshot previous Match state so post_save can detect transitions.
    """
    instance._previous_status = None
    if not instance.pk:
        return

    previous = Match.objects.filter(pk=instance.pk).only("status").first()
    if previous:
        instance._previous_status = previous.status


@receiver(post_save, sender=Match)
def recalculate_stats_on_match_completion(sender, instance, created, **kwargs):
    """
    Recalculate FantasyStats when a match transitions LIVE -> COMPLETED.
    This covers update-points flow and manual admin status edits.
    """
    if created:
        return

    previous_status = getattr(instance, "_previous_status", None)
    transitioned_live_to_completed = (
        previous_status == Match.Status.LIVE and
        instance.status == Match.Status.COMPLETED
    )
    if not transitioned_live_to_completed:
        return

    league_ids = FantasyLeague.objects.filter(
        season_id=instance.season_id
    ).values_list("id", flat=True)

    for league_id in league_ids:
        try:
            update_fantasy_stats(league_id)
            logger.info(
                "Recalculated FantasyStats after LIVE->COMPLETED transition for match %s in league %s",
                instance.id,
                league_id,
            )
        except Exception:
            logger.exception(
                "Failed FantasyStats recalc for match %s in league %s after status transition",
                instance.id,
                league_id,
            )
