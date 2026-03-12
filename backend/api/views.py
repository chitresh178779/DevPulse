import json
import os
import requests
import google.generativeai as genai
from datetime import datetime, timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import render
from allauth.socialaccount.providers.github.views import GitHubOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from .models import Snippet
from .serializers import SnippetSerializer  
from rest_framework import permissions, viewsets
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from allauth.socialaccount.models import SocialAccount
api_key = os.getenv("GENAI_API_KEY")
genai.configure(api_key=api_key)

@method_decorator(csrf_exempt, name='dispatch')
class GitHubLogin(SocialLoginView):
    adapter_class = GitHubOAuth2Adapter
    callback_url = 'http://localhost:3000/login/callback'
    client_class = OAuth2Client

class SnippetViewSet(viewsets.ModelViewSet):
    serializer_class = SnippetSerializer
    permission_classes = [permissions.IsAuthenticated] # Only logged-in users

    def get_queryset(self):
        # Users only see their OWN snippets
        return Snippet.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        # Automatically set the owner to the current user on save
        serializer.save(owner=self.request.user)

class RepoAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # 1. Find the GitHub social account linked to the logged-in user
            social_account = SocialAccount.objects.get(user=request.user, provider='github')
            
            # 2. Extract the exact GitHub handle
            github_username = social_account.extra_data.get('login')
            
            if not github_username:
                return Response({"error": "Could not extract GitHub handle from profile."}, status=400)
                
        except SocialAccount.DoesNotExist:
            return Response({"error": "No linked GitHub account found for this user."}, status=400)
        
        # 3. Fetch the repositories using the correct handle
        url = f"https://api.github.com/users/{github_username}/repos?sort=updated&per_page=6"
        gh_response = requests.get(url)

        if gh_response.status_code != 200:
            return Response({"error": "Failed to fetch from GitHub API"}, status=gh_response.status_code)

        # ---> MISSING PIECE 1: Parse the JSON response
        repos = gh_response.json()

        # ---> MISSING PIECE 2: Build the summary list for Gemini
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

        
        
        # Using 2.5-flash for maximum speed
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""
        Analyze these GitHub repositories: {json.dumps(repo_summaries)}
        Return a JSON array of objects. Each object must have:
        "id" (integer),
        "health_score" (integer 0-100),
        "future_score" (integer 0-100),
        "recovery_steps" (list of 2-3 specific action strings).
        """
        
        try:
            # ---> MISSING PIECE 3: Enforce strict JSON output
            ai_response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                )
            )
            
            ai_data = json.loads(ai_response.text)
            ai_dict = {item["id"]: item for item in ai_data}
            
        except Exception as e:
            print("Gemini API Error:", e)
            return Response({"error": "AI failed to analyze repositories."}, status=500)

        # 5. Merge GitHub Data with Gemini's AI Insights
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
        if not code_block:
            return Response({"error": "No code provided"}, status=400)

        # 1. Configure Gemini
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""
        Analyze the following code block. Find and extract any standalone JSON objects, JWT tokens, Cron expressions, or Regex patterns.
        Return a JSON array of objects. Each object must have:
        "type" (string: exactly one of "json", "jwt", "cron", or "regex"),
        "raw_string" (string: the exact verbatim substring found in the code).
        Code:
        {code_block}
        """
        
        try:
            # Enforce strict JSON output
            ai_response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(response_mime_type="application/json")
            )
            extracted_items = json.loads(ai_response.text)
        except Exception as e:
            print("Gemini API Error:", e)
            return Response({"error": "Extraction failed"}, status=500)

        # 2. Deterministic Index Mapping (The Safety Net)
        bindable_entities = []
        search_offset = 0

        for item in extracted_items:
            raw_string = item.get('raw_string', '')
            if not raw_string: 
                continue

            # Find exact starting point in the massive string
            start_index = code_block.find(raw_string, search_offset)
            
            if start_index != -1:
                end_index = start_index + len(raw_string)
                bindable_entities.append({
                    "id": f"entity_{start_index}",
                    "type": item.get('type'),
                    "value": raw_string,
                    "startIndex": start_index,
                    "endIndex": end_index
                })
                # Move offset to prevent finding the exact same string twice incorrectly
                search_offset = end_index 

        return Response({
            "original_code": code_block,
            "entities": bindable_entities
        })