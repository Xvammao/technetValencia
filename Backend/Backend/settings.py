"""
Django settings for Backend project.
"""

from pathlib import Path
import os
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent


SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-9ph68mrt2t%k^s6q^ngb6!^4psf$!@m=acj31_pz7yi&m)#)rm',
)

DEBUG = os.environ.get('DJANGO_DEBUG', 'False') == 'True'

default_allowed_hosts = ['localhost', '127.0.0.1']
env_allowed_hosts = os.environ.get('DJANGO_ALLOWED_HOSTS')
if env_allowed_hosts:
    ALLOWED_HOSTS = [h.strip() for h in env_allowed_hosts.split(',') if h.strip()]
else:
    ALLOWED_HOSTS = ['*'] if not DEBUG else default_allowed_hosts


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'Configuracion',
    'rest_framework',
    'rest_framework.authtoken',
    'djoser',
    'django_filters',
    'corsheaders',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': None,
}

DJOSER = {
    'LOGIN_FIELD': 'username',
    'USER_ID_FIELD': 'id',
    'TOKEN_MODEL': 'rest_framework.authtoken.models.Token',
    'SERIALIZERS': {},
    'HIDE_USERS': False,
    'SEND_ACTIVATION_EMAIL': False,
}

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

default_cors_origins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://technetvalencia.up.railway.app',
]
env_cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS')
if env_cors_origins:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in env_cors_origins.split(',') if o.strip()]
else:
    CORS_ALLOWED_ORIGINS = default_cors_origins

# En Railway, si no se configuran orígenes específicos, permitir todos los subdominios de railway.app
CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^https://.*\.up\.railway\.app$',
    r'^https://.*\.railway\.app$',
]

default_csrf_trusted = ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://technetvalencia.up.railway.app']
env_csrf_trusted = os.environ.get('CSRF_TRUSTED_ORIGINS')
if env_csrf_trusted:
    CSRF_TRUSTED_ORIGINS = [o.strip() for o in env_csrf_trusted.split(',') if o.strip()]
else:
    CSRF_TRUSTED_ORIGINS = default_csrf_trusted + ['https://*.up.railway.app', 'https://*.railway.app']

ROOT_URLCONF = 'Backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'Backend.wsgi.application'


database_url = os.environ.get('DATABASE_URL')
if database_url:
    DATABASES = {
        'default': dj_database_url.parse(database_url, conn_max_age=600),
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': 'telecomunicaciones_valencia',
            'USER': 'postgres',
            'PASSWORD': 'Xvam135911',
            'HOST': 'localhost',
            'PORT': '5432',
        }
    }


# Security settings for production
if not DEBUG:
    # SECURE_SSL_REDIRECT = True  # Railway handles SSL automatically
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Django 4.2+ usa STORAGES en lugar de STATICFILES_STORAGE
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
