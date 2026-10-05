from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('Configuracion', '0002_instalaciones_masorange'),
    ]

    operations = [
        migrations.CreateModel(
            name='DetalleInstalacionMasOrange',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                (
                    'instalacion',
                    models.OneToOneField(
                        db_column='instalacion_id',
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='detalle',
                        to='Configuracion.instalacionesmasorange',
                        db_constraint=False,
                    ),
                ),
                ('equipo_serial', models.CharField(blank=True, default='', max_length=100)),
                ('desco', models.BooleanField(default=False)),
                ('desco_serial', models.CharField(blank=True, default='', max_length=100)),
                ('tarjetas_sim', models.BooleanField(default=False)),
                ('seriales_tarjetas_sim', models.JSONField(blank=True, default=list)),
                ('acometida_id', models.IntegerField(blank=True, null=True)),
            ],
            options={
                'db_table': 'detalle_instalaciones_masorange',
            },
        ),
    ]
