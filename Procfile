web: cd backend && python manage.py migrate && python manage.py fix_fantasy_events && python manage.py recalculate_points --batch-size=500 --skip-ipl && gunicorn backend.wsgi --log-file -