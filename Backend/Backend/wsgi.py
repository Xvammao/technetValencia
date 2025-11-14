"""
WSGI config for Backend project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Backend.settings')

application = get_wsgi_application()

# Ejecutar collectstatic automáticamente en producción (por ejemplo Railway)
run_collectstatic = os.environ.get('DJANGO_COLLECTSTATIC_ON_START', 'False') == 'True'
if run_collectstatic:
  try:
    from django.conf import settings
    from django.core.management import call_command

    if not settings.DEBUG:
      call_command('collectstatic', interactive=False, verbosity=0)
  except Exception:
    # Si falla, no impide que la app arranque; solo afecta a los estáticos
    pass
