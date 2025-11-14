from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path('equipos/', views.EquiposListCreateView.as_view(), name='equipos-list-create'),
    path('equipos/<int:pk>/', views.EquiposRetrieveUpdateDestroyView.as_view(), name='equipos-retrieve-update-destroy'),
    path('instalaciones/', views.InstalacionesListCreateView.as_view(), name='instalaciones-list-create'),
    path('instalaciones/<int:pk>/', views.InstalacionesRetrieveUpdateDestroyView.as_view(), name='instalaciones-retrieve-update-destroy'),
    path('operador/', views.OperadorListCreateView.as_view(), name='operador-list-create'),
    path('operador/<int:pk>/', views.OperadorRetrieveUpdateDestroyView.as_view(), name='operador-retrieve-update-destroy'),
    path('ordenes/', views.OrdenesListCreateView.as_view(), name='ordenes-list-create'),
    path('ordenes/<int:pk>/', views.OrdenesRetrieveUpdateDestroyView.as_view(), name='ordenes-retrieve-update-destroy'),
    path('tecnicos/', views.TecnicosListCreateView.as_view(), name='tecnicos-list-create'),
    path('tecnicos/<int:pk>/', views.TecnicosRetrieveUpdateDestroyView.as_view(), name='tecnicos-retrieve-update-destroy'),
]
