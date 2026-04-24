import json
import re
from google import genai
from google.genai import types
from celery import shared_task
from django.utils import timezone
from .models import CodeAudit

@shared_task(bind=True)
def run_code_audit(self, audit_id, user_gemini_key): 
    try:
        # 1. Fetch the audit record and mark as processing
        audit = CodeAudit.objects.get(id=audit_id)
        audit.status = 'PROCESSING'
        audit.task_id = self.request.id
        audit.save()

        # 2. NEW SDK: Create an isolated client using the user's key
        client = genai.Client(api_key=user_gemini_key)

        # 3. The Strict System Prompt
        system_instruction = """You are an elite Staff Software Engineer conducting a deep architectural code review. 
        You MUST respond ONLY in raw, valid JSON. Do not include markdown formatting like ```json.
        
        Your JSON response must strictly match this exact schema:
        {
            "security_score": int (1-10),
            "performance_score": int (1-10),
            "readability_score": int (1-10),
            "feedback": {
                "security_issues": [
                    {
                        "title": "String",
                        "description": "String explaining the vulnerability",
                        "language": "String (e.g., python, javascript, java, cpp)",
                        "refactor": "String containing the corrected code snippet"
                    }
                ],
                "performance_bottlenecks": [
                    {
                        "title": "String",
                        "description": "String explaining the bottleneck",
                        "language": "String (e.g., python, javascript, java, cpp)",
                        "refactor": "String containing the optimized code snippet"
                    }
                ],
                "readability_improvements": [
                    {
                        "title": "String",
                        "description": "String explaining the readability issue",
                        "language": "String (e.g., python, javascript, java, cpp)",
                        "refactor": "String containing the cleaner code snippet"
                    }
                ],
                "language": "String (e.g., python, javascript, ruby, cpp) representing the overall file",
                "final_refactored_code": "String containing ONE complete, unified, heavily optimized, and secure version of the entire input code. Remove all bottlenecks."
            }
        }
        If a category has no issues, return an empty array [].
        """

        # 4. NEW SDK: Call Gemini with the new configuration syntax
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=audit.code_snippet,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json"
            )
        )
        
        raw_text = response.text
        
        # 5. The Universal Regex Sanitizer
        match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if not match:
            raise ValueError("No JSON object found in the AI response.")
            
        clean_text = match.group(0)
        result_data = json.loads(clean_text)

        # 6. Save the results back to the database
        audit.security_score = result_data['security_score']
        audit.performance_score = result_data['performance_score']
        audit.readability_score = result_data['readability_score']
        audit.feedback_json = result_data['feedback']
        audit.status = 'COMPLETED'
        audit.completed_at = timezone.now()
        audit.save()

        return "Audit Completed Successfully"

    except Exception as e:
        audit = CodeAudit.objects.get(id=audit_id)
        audit.status = 'FAILED'
        
        error_msg = str(e).lower()
        if "api_key_invalid" in error_msg or "403" in error_msg or "api key not valid" in error_msg:
            audit.feedback_json = {"error": "The Gemini API key provided is invalid or expired. Please check your Settings."}
        else:
            audit.feedback_json = {"error": f"An unexpected error occurred: {str(e)}"}
            
        audit.save()
        print(f"Audit Failed: {str(e)}")
        return "Audit Failed"