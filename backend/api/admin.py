from django.contrib import admin
from .models import Snippet

@admin.register(Snippet)
class SnippetAdmin(admin.ModelAdmin):
    # This makes the admin list view much more useful
    list_display = ('title', 'owner', 'language', 'created_at')
    # Adds a sidebar filter for language and date
    list_filter = ('language', 'created_at')
    # Allows you to search by title or description
    search_fields = ('title', 'description')