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


class InstalacionesMasOrangeSerializer(serializers.ModelSerializer):
    equipo_serial = serializers.CharField(
        required=False, allow_blank=True, max_length=100, write_only=True
    )
    desco = serializers.BooleanField(required=False, write_only=True)
    desco_serial = serializers.CharField(
        required=False, allow_blank=True, max_length=100, write_only=True
    )
    tarjetas_sim = serializers.BooleanField(required=False, write_only=True)
    seriales_tarjetas_sim = serializers.ListField(
        child=serializers.CharField(allow_blank=False),
        required=False,
        write_only=True,
    )
    acometida_id = serializers.IntegerField(
        required=False, allow_null=True, write_only=True
    )

    class Meta:
        model = models.InstalacionesMasOrange
        fields = '__all__'

    def validate(self, attrs):
        detail_fields = {
            'equipo_serial',
            'desco',
            'desco_serial',
            'tarjetas_sim',
            'seriales_tarjetas_sim',
            'acometida_id',
        }
        has_detail = bool(detail_fields.intersection(attrs))
        equipo_serial = attrs.get('equipo_serial', '').strip()
        desco = attrs.get('desco', False)
        desco_serial = attrs.get('desco_serial', '').strip()
        tarjetas_sim = attrs.get('tarjetas_sim', False)
        sim_seriales = attrs.get('seriales_tarjetas_sim', [])
        acometida_id = attrs.get('acometida_id')

        if has_detail and not equipo_serial:
            raise serializers.ValidationError({
                'equipo_serial': 'Indica el serial del equipo.'
            })
        if equipo_serial:
            equipo = models.Equipos.objects.filter(
                numero_serie_equipo__iexact=equipo_serial
            ).first()
            if equipo is None:
                raise serializers.ValidationError({
                    'equipo_serial': (
                        f'El equipo con serial "{equipo_serial}" '
                        'no existe en el inventario.'
                    )
                })
            attrs['equipo_serial'] = equipo.numero_serie_equipo

        if desco and not desco_serial:
            raise serializers.ValidationError({
                'desco_serial': 'Indica el serial del DESCO.'
            })
        if desco_serial:
            equipo_desco = models.Equipos.objects.filter(
                numero_serie_equipo__iexact=desco_serial
            ).first()
            if equipo_desco is None:
                raise serializers.ValidationError({
                    'desco_serial': (
                        f'El equipo con serial "{desco_serial}" '
                        'no existe en el inventario.'
                    )
                })
            attrs['desco_serial'] = equipo_desco.numero_serie_equipo
        if 'desco' in attrs and not desco:
            attrs['desco_serial'] = ''

        if tarjetas_sim and (
            not sim_seriales or any(not serial.strip() for serial in sim_seriales)
        ):
            raise serializers.ValidationError({
                'seriales_tarjetas_sim': (
                    'Indica el serial de cada tarjeta SIM.'
                )
            })
        if 'tarjetas_sim' in attrs and not tarjetas_sim:
            attrs['seriales_tarjetas_sim'] = []

        if acometida_id is not None and not models.Acometidas.objects.filter(
            pk=acometida_id
        ).exists():
            raise serializers.ValidationError({
                'acometida_id': 'La acometida seleccionada no existe.'
            })
        return attrs

    @staticmethod
    def _extract_detail_data(validated_data):
        detail_fields = (
            'equipo_serial',
            'desco',
            'desco_serial',
            'tarjetas_sim',
            'seriales_tarjetas_sim',
            'acometida_id',
        )
        return {
            field: validated_data.pop(field)
            for field in detail_fields
            if field in validated_data
        }

    @staticmethod
    def _save_detail(instance, detail_data):
        if not detail_data:
            return
        defaults = {
            'equipo_serial': detail_data.get('equipo_serial', ''),
            'desco': detail_data.get('desco', False),
            'desco_serial': detail_data.get('desco_serial', ''),
            'tarjetas_sim': detail_data.get('tarjetas_sim', False),
            'seriales_tarjetas_sim': detail_data.get(
                'seriales_tarjetas_sim', []
            ),
            'acometida_id': detail_data.get('acometida_id'),
        }
        models.DetalleInstalacionMasOrange.objects.update_or_create(
            instalacion=instance,
            defaults=defaults,
        )

    def create(self, validated_data):
        detail_data = self._extract_detail_data(validated_data)
        instance = super().create(validated_data)
        self._save_detail(instance, detail_data)
        return instance

    def update(self, instance, validated_data):
        detail_data = self._extract_detail_data(validated_data)
        updated = super().update(instance, validated_data)
        self._save_detail(updated, detail_data)
        return updated

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        detail = models.DetalleInstalacionMasOrange.objects.filter(
            instalacion_id=instance.pk
        ).first()
        representation.update({
            'equipo_serial': detail.equipo_serial if detail else '',
            'desco': detail.desco if detail else False,
            'desco_serial': detail.desco_serial if detail else '',
            'tarjetas_sim': detail.tarjetas_sim if detail else False,
            'seriales_tarjetas_sim': (
                detail.seriales_tarjetas_sim if detail else []
            ),
            'acometida_id': detail.acometida_id if detail else None,
        })
        return representation


class AcometidasSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Acometidas
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
