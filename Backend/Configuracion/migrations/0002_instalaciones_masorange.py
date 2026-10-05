from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Configuracion', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='InstalacionesMasOrange',
            fields=[
                ('id_instalaciones', models.AutoField(primary_key=True, serialize=False)),
                ('numero_serie_equipo', models.CharField(max_length=100, unique=True)),
                ('numero_de_orden', models.CharField(max_length=100)),
                ('fecha_cierre', models.DateField(blank=True, null=True)),
                ('id_tecnico_empresa', models.CharField(max_length=50)),
                ('nombre_tecnico', models.CharField(max_length=150)),
                ('descripcion', models.TextField(blank=True, null=True)),
                ('tipo', models.CharField(blank=True, max_length=100, null=True)),
                ('tipo_orden', models.CharField(blank=True, max_length=100, null=True)),
            ],
            options={
                'db_table': 'instalaciones_masorange',
            },
        ),
    ]
