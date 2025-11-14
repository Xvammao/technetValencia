from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('Configuracion.urls')),
    path('token/', include('djoser.urls')),
    path('token/', include('djoser.urls.authtoken')),
]
