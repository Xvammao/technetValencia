from django.contrib import admin
from . import models

admin.site.register(models.Equipos)
admin.site.register(models.Instalaciones)
admin.site.register(models.Operador)
admin.site.register(models.Ordenes)
admin.site.register(models.Tecnicos)

# Register your models here.
