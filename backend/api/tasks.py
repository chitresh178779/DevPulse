import json
import re
import os
import google.generativeai as genai
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from .models import CodeAudit

# Configure Gemini
genai.configure(api_key=os.getenv('GENAI_API_KEY')) # Make sure this is in your settings.py!

@shared_task(bind=True)
def run_code_audit(self, audit_id):
    try:
        # 1. Fetch the audit record and mark as processing
        audit = CodeAudit.objects.get(id=audit_id)
        audit.status = 'PROCESSING'
        audit.task_id = self.request.id
        audit.save()

        # 2. The Strict System Prompt
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

        # 3. Call Gemini (Forcing JSON output)
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=system_instruction,
            generation_config={"response_mime_type": "application/json"}
        )
        
        response = model.generate_content(audit.code_snippet)
        raw_text = response.text
        
        # 4. The Universal Regex Sanitizer
        # This regex finds the first '{' and the last '}' and grabs everything in between
        match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        
        if not match:
            raise ValueError("No JSON object found in the AI response.")
            
        clean_text = match.group(0)
        
        # Parse safely!
        result_data = json.loads(clean_text)

        # 5. Save the results back to the database
        audit.security_score = result_data['security_score']
        audit.performance_score = result_data['performance_score']
        audit.readability_score = result_data['readability_score']
        audit.feedback_json = result_data['feedback']
        audit.status = 'COMPLETED'
        audit.completed_at = timezone.now()
        audit.save()

        return "Audit Completed Successfully"

    except Exception as e:
        # Handle failures gracefully
        audit = CodeAudit.objects.get(id=audit_id)
        audit.status = 'FAILED'
        audit.save()
        print(f"Audit Failed: {str(e)}")
        return "Audit Failed"