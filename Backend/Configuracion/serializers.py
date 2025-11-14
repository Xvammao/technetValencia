from  rest_framework import serializers
from . import models

class EquiposSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Equipos
        fields = '__all__'

class InstalacionesSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Instalaciones
        fields = '__all__'


class OperadorSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Operador
        fields = '__all__'


class OrdenesSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Ordenes
        fields = '__all__'


class TecnicosSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Tecnicos
        fields = '__all__'

