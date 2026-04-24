import json
import os
import requests
from google import genai
from google.genai import types
from datetime import datetime, timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import render
from allauth.socialaccount.providers.github.views import GitHubOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from .models import Snippet, ComponentSnippet, CodeAudit, WorkspaceSnapshot
from .tasks import run_code_audit
from .serializers import SnippetSerializer, ComponentSnippetSerializer
from rest_framework import permissions, viewsets
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from allauth.socialaccount.models import SocialAccount, SocialToken
from rest_framework import generics

# DELETED THE GLOBAL genai.configure() FROM HERE!

@method_decorator(csrf_exempt, name='dispatch')
class GitHubLogin(SocialLoginView):
    adapter_class = GitHubOAuth2Adapter
    callback_url = 'http://localhost:3000/login/callback'
    client_class = OAuth2Client

class SnippetViewSet(viewsets.ModelViewSet):
    serializer_class = SnippetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Snippet.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class RepoAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1. Grab the custom Gemini API Key from the headers (since this is a GET request)
        user_gemini_key = request.headers.get('X-Gemini-Key')
        if not user_gemini_key:
            return Response({"error": "Gemini API Key is required. Please add it in Settings."}, status=400)

        try:
            social_account = SocialAccount.objects.get(user=request.user, provider='github')
            github_username = social_account.extra_data.get('login')
            
            if not github_username:
                return Response({"error": "Could not extract GitHub handle."}, status=400)
                
            try:
                social_token = SocialToken.objects.get(account=social_account)
                github_token = social_token.token
            except SocialToken.DoesNotExist:
                github_token = None
                
        except SocialAccount.DoesNotExist:
            return Response({"error": "No linked GitHub account found."}, status=400)
        
        url = f"https://api.github.com/users/{github_username}/repos?sort=updated&per_page=6"
        
        headers = {'Accept': 'application/vnd.github.v3+json'}
        if github_token:
            headers['Authorization'] = f'token {github_token}'
            
        gh_response = requests.get(url, headers=headers)

        if gh_response.status_code != 200:
            print("GitHub API Error:", gh_response.json())
            return Response({"error": "Failed to fetch from GitHub API"}, status=502)

        repos = gh_response.json()

        repo_summaries = []
        for r in repos:
            repo_summaries.append({
                "id": r.get("id"),
                "name": r.get("name"),
                "language": r.get("language"),
                "stars": r.get("stargazers_count"),
                "issues": r.get("open_issues_count"),
                "has_description": bool(r.get("description")),
                "last_updated": r.get("updated_at")
            })

        # 2. Configure Gemini locally for this specific request using the user's key
        client = genai.Client(api_key=user_gemini_key)
        
        prompt = f"""
        Analyze these GitHub repositories: {json.dumps(repo_summaries)}
        Return a JSON array of objects. Each object must have:
        "id" (integer),
        "health_score" (integer 0-100),
        "future_score" (integer 0-100),
        "recovery_steps" (list of 2-3 specific action strings).
        """
        
        try:
            # NEW SDK: Generate content
            ai_response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            
            ai_data = json.loads(ai_response.text)
            ai_dict = {item["id"]: item for item in ai_data}
            
        except Exception as e:
            print("Gemini API Error:", e)
            return Response({"error": "AI failed to analyze repositories. Check your API key."}, status=500)

        final_data = []
        now = datetime.now(timezone.utc)
        
        for repo in repos:
            r_id = repo.get("id")
            ai_info = ai_dict.get(r_id, {}) 
            
            updated_at_str = repo.get('updated_at')
            if updated_at_str:
                updated_at = datetime.strptime(updated_at_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
                days_inactive = (now - updated_at).days
            else:
                days_inactive = 0

            final_data.append({
                "id": r_id,
                "name": repo.get("name"),
                "description": repo.get("description") or "No description provided.",
                "language": repo.get("language") or "Mixed",
                "stars": repo.get("stargazers_count", 0),
                "issues": repo.get("open_issues_count", 0),
                "days_inactive": days_inactive,
                "url": repo.get("html_url"),
                "updated_at": updated_at_str,
                "health_score": ai_info.get("health_score", 70),
                "future_score": ai_info.get("future_score", 70),
                "recovery_steps": ai_info.get("recovery_steps", ["Review repository for optimizations."])
            })
            
        return Response(final_data)

class CodeAuditorView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code_block = request.data.get('code', '')
        user_gemini_key = request.data.get('gemini_api_key')

        if not code_block:
            return Response({"error": "No code provided"}, status=400)
        if not user_gemini_key:
            return Response({"error": "Gemini API Key is required. Please add it in Settings."}, status=400)

        # 1. Configure Gemini locally using the user's key
        client = genai.Client(api_key=user_gemini_key)
        
        prompt = f"""
        Analyze the following code block. Find and extract any standalone JSON objects, JWT tokens, Cron expressions, or Regex patterns.
        
        CRITICAL RULES:
        1. For Regex patterns, you MUST return the EXACT verbatim substring as it appears in the code. 
        2. Preserve ALL double backslashes (e.g., if the code has \\\\d, you must return \\\\d, do NOT unescape it to \\d).
        
        Return a JSON array of objects. Each object must have:
        "type" (string: exactly one of "json", "jwt", "cron", or "regex"),
        "raw_string" (string: the exact verbatim substring found in the code).
        Code:
        {code_block}
        """
        
        try:
            # NEW SDK: Generate content
            ai_response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            extracted_items = json.loads(ai_response.text)
        except Exception as e:
            print("Gemini API Error:", e)
            return Response({"error": "Extraction failed. Check your API key."}, status=500)

        bindable_entities = []
        search_offset = 0

        for item in extracted_items:
            raw_string = item.get('raw_string', '')
            if not raw_string: 
                continue

            start_index = code_block.find(raw_string, search_offset)
            
            if start_index == -1:
                re_escaped_string = raw_string.replace('\\', '\\\\')
                start_index = code_block.find(re_escaped_string, search_offset)
                if start_index != -1:
                    raw_string = re_escaped_string 

            if start_index == -1:
                stripped_string = raw_string.strip('"\'')
                start_index = code_block.find(stripped_string, search_offset)
                if start_index != -1:
                    raw_string = stripped_string

            if start_index != -1:
                end_index = start_index + len(raw_string)
                bindable_entities.append({
                    "id": f"entity_{start_index}",
                    "type": item.get('type'),
                    "value": raw_string,
                    "startIndex": start_index,
                    "endIndex": end_index
                })
                search_offset = end_index 
            else:
                print(f"DEBUG - Failed to map {item.get('type')}: {raw_string}")

        return Response({
            "original_code": code_block,
            "entities": bindable_entities
        })

class ComponentListCreateView(generics.ListCreateAPIView):
    serializer_class = ComponentSnippetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ComponentSnippet.objects.filter(user=self.request.user).order_by('-updated_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ComponentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ComponentSnippetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ComponentSnippet.objects.filter(user=self.request.user)

class CodeAuditSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code')
        # Grab the custom key from the frontend!
        user_gemini_key = request.data.get('gemini_api_key')

        if not code:
            return Response({'error': 'No code provided'}, status=status.HTTP_400_BAD_REQUEST)
        if not user_gemini_key:
            return Response({'error': 'Gemini API Key is required. Please add it in Settings.'}, status=status.HTTP_400_BAD_REQUEST)
        
        audit = CodeAudit.objects.create(user=request.user, code_snippet=code)
        
        # Pass the key to Celery!
        run_code_audit.delay(audit.id, user_gemini_key)
        
        return Response({
            'message': 'Audit queued successfully', 
            'audit_id': audit.id
        }, status=status.HTTP_202_ACCEPTED)

class CodeAuditStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            audit = CodeAudit.objects.get(id=pk, user=request.user)
            
            return Response({
                'status': audit.status,
                'security_score': audit.security_score,
                'performance_score': audit.performance_score,
                'readability_score': audit.readability_score,
                'feedback': audit.feedback_json
            })
        except CodeAudit.DoesNotExist:
            return Response({'error': 'Audit not found'}, status=status.HTTP_404_NOT_FOUND)
        
class WorkspaceSnapshotView(APIView):
    permission_classes = [IsAuthenticated]

    # --- THE "PAUSE WORKFLOW" ACTION ---
    def post(self, request):
        vault_data = request.data.get('vault_state', {})
        auditor_data = request.data.get('auditor_state', {})

        snapshot, created = WorkspaceSnapshot.objects.update_or_create(
            user=request.user,
            defaults={
                'vault_state': vault_data,
                'auditor_state': auditor_data
            }
        )

        return Response(
            {"message": "Workflow paused and safely secured."}, 
            status=status.HTTP_200_OK
        )

    # --- THE "RESUME WORKFLOW" ACTION (WITH AI BRIEFING) ---
    def get(self, request):
        try:
            snapshot = WorkspaceSnapshot.objects.get(user=request.user)
        except WorkspaceSnapshot.DoesNotExist:
            return Response(
                {"error": "No active snapshot found."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # 1. Grab the custom Gemini Key from the headers
        user_gemini_key = request.headers.get('X-Gemini-Key')
        
        # Default fallback message if they don't have a key set up
        ai_briefing = "Welcome back! Your workspace has been restored."

        # 2. The AI Briefing Engine
        if user_gemini_key:
            try:
                # Use the new isolated SDK client!
                client = genai.Client(api_key=user_gemini_key)
                
                prompt = f"""
                You are 'DevPulse', an elite AI assistant for a software developer.
                The developer paused their work a while ago and just returned.
                Analyze their saved workspace state and write a quick, energetic 2-3 sentence 'Welcome Back' briefing.
                Tell them exactly what they were working on based on the code and utilities, and hype them up to dive back in.
                
                Vault State (Utilities/Regex/Tokens): {json.dumps(snapshot.vault_state)}
                Auditor State (Code under review): {json.dumps(snapshot.auditor_state)}
                
                Keep it conversational, professional, and concise. Speak directly to the developer.
                """
                
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                )
                
                # Overwrite the fallback with the actual AI response
                ai_briefing = response.text.strip()
                
            except Exception as e:
                print("AI Briefing Failed:", e)
                ai_briefing = "Welcome back! We couldn't generate your AI briefing (check your Gemini API key), but your code is fully restored."

        # 3. Return everything to React
        return Response({
            "vault_state": snapshot.vault_state,
            "auditor_state": snapshot.auditor_state,
            "last_saved": snapshot.updated_at,
            "ai_briefing": ai_briefing
        }, status=status.HTTP_200_OK)