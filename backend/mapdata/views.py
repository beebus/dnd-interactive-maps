import json
import smtplib
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.core.mail import send_mail
from django.conf import settings


@csrf_exempt
@require_POST
def contact(request):
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'error': 'Invalid request.'}, status=400)

    name = str(data.get('name', '')).strip()
    email = str(data.get('email', '')).strip()
    message = str(data.get('message', '')).strip()

    if not name or not email or not message:
        return JsonResponse({'error': 'All fields are required.'}, status=400)

    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({'error': 'Invalid email address.'}, status=400)

    try:
        send_mail(
            subject=f'[D&D Maps] Comment from {name}',
            message=f'From: {name} <{email}>\n\n{message}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.CONTACT_EMAIL],
            fail_silently=False,
        )
    except (smtplib.SMTPException, OSError):
        return JsonResponse({'error': 'Failed to send message. Please try again later.'}, status=500)

    return JsonResponse({'status': 'ok'})
