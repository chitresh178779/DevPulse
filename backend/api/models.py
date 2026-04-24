from django.db import models
from django.contrib.auth.models import User

class Snippet(models.Model):
    # Links the snippet to the logged-in user
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='snippets')
    title = models.CharField(max_length=255)
    code = models.TextField()
    language = models.CharField(max_length=50, default='javascript')
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __clstr__(self):
        return self.title

class ComponentSnippet(models.Model):
    # Link it to the user so everyone has their own private library
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='components')
    title = models.CharField(max_length=255)
    code = models.TextField()
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
    
class CodeAudit(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='audits')
    task_id = models.CharField(max_length=255, blank=True, null=True) # Celery task ID
    code_snippet = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # AI Scores (1-10)
    security_score = models.IntegerField(null=True, blank=True)
    performance_score = models.IntegerField(null=True, blank=True)
    readability_score = models.IntegerField(null=True, blank=True)
    
    # The detailed refactoring suggestions
    feedback_json = models.JSONField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Audit {self.id} - {self.status}"
    
class WorkspaceSnapshot(models.Model):
    # OneToOne ensures each user has exactly one snapshot at a time
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='workspace_snapshot')
    
    # We store the raw JSON exactly as React sends it
    vault_state = models.JSONField(default=dict, blank=True)
    auditor_state = models.JSONField(default=dict, blank=True)
    
    # Automatically updates every time they hit 'Pause'
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Workflow Snapshot"