from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Configuracion', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.CreateModel(
                    name='InstalacionesMasOrange',
                    fields=[
                        ('id', models.AutoField(primary_key=True, serialize=False)),
                        ('ot', models.CharField(max_length=100)),
                        ('operador', models.CharField(max_length=150)),
                        ('tipo', models.CharField(max_length=100)),
                        ('fecha_cierre', models.DateField(blank=True, null=True)),
                        ('tecnico_asignado', models.CharField(max_length=150)),
                    ],
                    options={
                        'db_table': 'instalaciones_masorange',
                        'managed': False,
                    },
                ),
                migrations.CreateModel(
                    name='Acometidas',
                    fields=[
                        ('id', models.AutoField(primary_key=True, serialize=False)),
                        ('acometida', models.TextField()),
                        ('valor_tecnico', models.TextField(blank=True, null=True)),
                        ('valor_empresa', models.TextField(blank=True, null=True)),
                    ],
                    options={
                        'db_table': 'acometidas',
                        'managed': False,
                    },
                ),
            ],
        ),
    ]
