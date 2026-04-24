"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.views import GitHubLogin, RepoAnalyticsView , SnippetViewSet, CodeAuditorView, ComponentListCreateView, ComponentDetailView, CodeAuditStatusView, CodeAuditSubmitView, WorkspaceSnapshotView


router = DefaultRouter()
router.register(r'snippets', SnippetViewSet, basename='snippet')


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
    path('api/auth/github/login/', GitHubLogin.as_view(), name='github_login'),
    path('api/analytics/repos/', RepoAnalyticsView.as_view(), name='repo_analytics'),
    path('api/utilities/extract/', CodeAuditorView.as_view(), name='code_auditor'),
    path('api/components/', ComponentListCreateView.as_view(), name='component-list'),
    path('api/components/<int:pk>/', ComponentDetailView.as_view(), name='component-detail'),
    path('api/audit/submit/', CodeAuditSubmitView.as_view(), name='audit_submit'),
    path('api/audit/<int:pk>/status/', CodeAuditStatusView.as_view(), name='audit_status'),
    path('api/workspace/snapshot/', WorkspaceSnapshotView.as_view(), name='workspace_snapshot'),
]
