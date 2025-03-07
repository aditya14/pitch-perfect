# management/commands/process_trades.py
from django.core.management.base import BaseCommand
from api.models import FantasyTrade, IPLMatch
from api.views import process_trade

class Command(BaseCommand):
    help = 'Process accepted trades if no match is live'

    def handle(self, *args, **options):
        # Check if there's a live match
        live_match = IPLMatch.objects.filter(status='LIVE').exists()
        
        if not live_match:
            # Process all accepted trades
            accepted_trades = FantasyTrade.objects.filter(status='Accepted')
            
            for trade in accepted_trades:
                process_trade(trade)
                self.stdout.write(f"Processed trade #{trade.id}")
            
            self.stdout.write(f"Processed {accepted_trades.count()} trades")
        else:
            self.stdout.write("Skipping trade processing - match is live")