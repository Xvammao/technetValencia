from rest_framework import generics, status, response
from rest_framework.response import Response
from . import models
from . import serializers

# Equipos

class EquiposListCreateView(generics.ListCreateAPIView):
    queryset = models.Equipos.objects.all()
    serializer_class = serializers.EquiposSerializer

    def List (self, request, *args, **kwargs):
        response = super().List(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)

    def Create (self, request, *args, **kwargs):
        response = super().Create(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_201_CREATED)

class EquiposRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = models.Equipos.objects.all()
    serializer_class = serializers.EquiposSerializer

    def Retrieve (self, request, *args, **kwargs):
        response = super().Retrieve(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)

    def Update (self, request, *args, **kwargs):
        response = super().Update(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)

    def Destroy (self, request, *args, **kwargs):
        response = super().Destroy(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)

# instalaciones

class InstalacionesListCreateView(generics.ListCreateAPIView):
    queryset = models.Instalaciones.objects.all()
    serializer_class = serializers.InstalacionesSerializer

    def List (self, request, *args, **kwargs):
        response = super().List(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)

    def Create (self, request, *args, **kwargs):
        response = super().Create(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_201_CREATED)

class InstalacionesRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = models.Instalaciones.objects.all()
    serializer_class = serializers.InstalacionesSerializer

    def Retrieve (self, request, *args, **kwargs):
        response = super().Retrieve(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)

    def Update (self, request, *args, **kwargs):
        response = super().Update(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)

    def Destroy (self, request, *args, **kwargs):
        response = super().Destroy(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)

# operador

class OperadorListCreateView(generics.ListCreateAPIView):
    queryset = models.Operador.objects.all()
    serializer_class = serializers.OperadorSerializer

    def List (self, request, *args, **kwargs):
        response = super().List(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)

    def Create (self, request, *args, **kwargs):
        response = super().Create(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_201_CREATED)

class OperadorRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = models.Operador.objects.all()
    serializer_class = serializers.OperadorSerializer

    def Retrieve (self, request, *args, **kwargs):
        response = super().Retrieve(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)

    def Update (self, request, *args, **kwargs):
        response = super().Update(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)

    def Destroy (self, request, *args, **kwargs):
        response = super().Destroy(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)

# ordenes

class OrdenesListCreateView(generics.ListCreateAPIView):
    queryset = models.Ordenes.objects.all()
    serializer_class = serializers.OrdenesSerializer

    def List (self, request, *args, **kwargs):
        response = super().List(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)

    def Create (self, request, *args, **kwargs):
        response = super().Create(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_201_CREATED)

class OrdenesRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = models.Ordenes.objects.all()
    serializer_class = serializers.OrdenesSerializer

    def Retrieve (self, request, *args, **kwargs):
        response = super().Retrieve(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)

    def Update (self, request, *args, **kwargs):
        response = super().Update(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)

    def Destroy (self, request, *args, **kwargs):
        response = super().Destroy(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)

# tecnicos

class TecnicosListCreateView(generics.ListCreateAPIView):
    queryset = models.Tecnicos.objects.all()
    serializer_class = serializers.TecnicosSerializer

    def List (self, request, *args, **kwargs):
        response = super().List(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)

    def Create (self, request, *args, **kwargs):
        response = super().Create(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_201_CREATED)

class TecnicosRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = models.Tecnicos.objects.all()
    serializer_class = serializers.TecnicosSerializer

    def Retrieve (self, request, *args, **kwargs):
        response = super().Retrieve(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)

    def Update (self, request, *args, **kwargs):
        response = super().Update(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)

    def Destroy (self, request, *args, **kwargs):
        response = super().Destroy(request, *args, **kwargs)
        return Response ({
            'status': 'success',
            'data': response.data
        }, status=status.HTTP_200_OK)