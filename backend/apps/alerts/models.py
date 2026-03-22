from django.db import models


class BotConfig(models.Model):
    """Singleton model storing Telegram bot credentials configured via UI."""
    token   = models.CharField(max_length=200)
    chat_id = models.CharField(max_length=50)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Bot Config"

    @classmethod
    def get(cls):
        return cls.objects.first()

    @classmethod
    def save_credentials(cls, token: str, chat_id: str):
        obj = cls.objects.first()
        if obj:
            obj.token = token
            obj.chat_id = chat_id
            obj.save()
        else:
            cls.objects.create(token=token, chat_id=chat_id)

    def __str__(self):
        return f"BotConfig(chat_id={self.chat_id})"
