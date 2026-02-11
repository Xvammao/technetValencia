# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class Equipos(models.Model):
    id_equipos = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=150)
    numero_serie_equipo = models.CharField(unique=True, max_length=100)
    tecnico = models.CharField(max_length=150)
    operador = models.ForeignKey('Operador', models.DO_NOTHING, db_column='operador', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'equipos'

    def __str__(self):
        return f"{self.id_equipos}-{self.nombre}-{self.numero_serie_equipo}"


class Instalaciones(models.Model):
    id_instalaciones = models.AutoField(primary_key=True)
    numero_serie_equipo = models.CharField(unique=True, max_length=100)
    numero_de_orden = models.CharField(max_length=100)
    fecha_cierre = models.DateField(blank=True, null=True)
    id_tecnico_empresa = models.CharField(max_length=50)
    nombre_tecnico = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, null=True)
    tipo = models.CharField(max_length=100, blank=True, null=True)
    tipo_orden = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'instalaciones'

    def __str__(self):
        return f"{self.id_instalaciones}-{self.numero_serie_equipo}-{self.numero_de_orden}"


class Operador(models.Model):
    id_operador = models.AutoField(primary_key=True)
    nombre_operador = models.CharField(max_length=150)

    class Meta:
        managed = False
        db_table = 'operador'

    def __str__(self):
        return f"{self.id_operador}-{self.nombre_operador}"


class Ordenes(models.Model):
    id_orden = models.AutoField(primary_key=True)
    tipo_orden = models.CharField(max_length=100)
    puntos_orden = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    valor_orden_tecnico = models.TextField(blank=True, null=True)  # This field type is a guess.
    valor_orden_empresa = models.TextField(blank=True, null=True)  # This field type is a guess.

    class Meta:
        managed = False
        db_table = 'ordenes'

    def __str__(self):
        return f"{self.id_orden}-{self.tipo_orden}-{self.puntos_orden}"


class Tecnicos(models.Model):
    id_tecnico = models.AutoField(primary_key=True)
    nombre_tecnico = models.CharField(max_length=150)
    id_tecnico_empresa = models.CharField(unique=True, max_length=50)

    class Meta:
        managed = False
        db_table = 'tecnicos'

    def __str__(self):
        return f"{self.id_tecnico}-{self.nombre_tecnico}-{self.id_tecnico_empresa}"