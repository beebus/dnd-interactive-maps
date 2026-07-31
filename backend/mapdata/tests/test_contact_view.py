import json
import smtplib
from unittest.mock import patch

from django.core import mail
from django.test import Client, TestCase, override_settings


class ContactViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.url = "/api/contact/"
        self.valid_payload = {
            "name": "Drizzt Do'Urden",
            "email": "drizzt@menzoberranzan.test",
            "message": "Love the map, thanks!",
        }

    def test_get_not_allowed(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 405)

    def test_invalid_json_body_returns_400(self):
        response = self.client.post(self.url, data="not-json", content_type="application/json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"error": "Invalid request."})

    def test_missing_fields_returns_400(self):
        response = self.client.post(
            self.url,
            data=json.dumps({"name": "", "email": "", "message": ""}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"error": "All fields are required."})

    def test_whitespace_only_fields_are_treated_as_missing(self):
        response = self.client.post(
            self.url,
            data=json.dumps({"name": "   ", "email": "drizzt@menzoberranzan.test", "message": "hi"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"error": "All fields are required."})

    def test_invalid_email_returns_400(self):
        response = self.client.post(
            self.url,
            data=json.dumps({**self.valid_payload, "email": "not-an-email"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"error": "Invalid email address."})

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        DEFAULT_FROM_EMAIL="noreply@dndmaps.test",
        CONTACT_EMAIL="owner@dndmaps.test",
    )
    def test_valid_submission_sends_email_and_returns_ok(self):
        response = self.client.post(
            self.url, data=json.dumps(self.valid_payload), content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

        self.assertEqual(len(mail.outbox), 1)
        sent = mail.outbox[0]
        self.assertEqual(sent.subject, "[D&D Maps] Comment from Drizzt Do'Urden")
        self.assertIn("Love the map, thanks!", sent.body)
        self.assertEqual(sent.to, ["owner@dndmaps.test"])

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        DEFAULT_FROM_EMAIL="noreply@dndmaps.test",
        CONTACT_EMAIL="owner@dndmaps.test",
    )
    def test_strips_whitespace_from_submitted_fields(self):
        padded_payload = {
            "name": "  Drizzt  ",
            "email": "  drizzt@menzoberranzan.test  ",
            "message": "  hi there  ",
        }
        response = self.client.post(
            self.url, data=json.dumps(padded_payload), content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("Drizzt", mail.outbox[0].subject)
        self.assertNotIn("  Drizzt  ", mail.outbox[0].subject)

    @patch("mapdata.views.send_mail", side_effect=smtplib.SMTPException("connection refused"))
    def test_smtp_failure_returns_500(self, _mock_send_mail):
        response = self.client.post(
            self.url, data=json.dumps(self.valid_payload), content_type="application/json"
        )
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"error": "Failed to send message. Please try again later."})

    @patch("mapdata.views.send_mail", side_effect=OSError("network unreachable"))
    def test_os_error_returns_500(self, _mock_send_mail):
        response = self.client.post(
            self.url, data=json.dumps(self.valid_payload), content_type="application/json"
        )
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"error": "Failed to send message. Please try again later."})
