from django.apps import AppConfig
from importlib import import_module


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # Register model signals if module is present in this deployment.
        module_name = f"{self.name}.signals"
        try:
            import_module(module_name)
        except ModuleNotFoundError as exc:
            # Avoid crashing app startup only when the signals module itself is missing.
            # Re-raise for any nested missing dependency inside signals.py.
            if exc.name != module_name:
                raise
