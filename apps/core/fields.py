from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.db import models


def _fernet():
    return Fernet(settings.ENCRYPTION_KEY.encode())


class EncryptedTextField(models.TextField):
    """Text column encrypted at rest with Fernet (key: AIC_ENCRYPTION_KEY)."""

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if not value:
            return value
        return _fernet().encrypt(value.encode()).decode()

    def from_db_value(self, value, expression, connection):
        if not value:
            return value
        try:
            return _fernet().decrypt(value.encode()).decode()
        except InvalidToken:
            # Wrong or rotated key: treat as unset rather than crash the page.
            return ""
