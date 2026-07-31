import json
from unittest.mock import MagicMock

from django.test import TestCase

from ..management.commands.analyze_map import Command


class AnalyzeMapDraftIssueTest(TestCase):
    @staticmethod
    def _client_returning(title, body):
        client = MagicMock()
        client.messages.create.return_value = MagicMock(
            content=[MagicMock(text=json.dumps({"title": title, "body": body}))]
        )
        return client

    def test_drafts_missing_pin_issue(self):
        client = self._client_returning("Missing pin: Menzoberranzan", "Add it.")
        result = Command._draft_issue(client, kind="missing_pin", detail="found on map but not in DB")
        self.assertEqual(result, {"title": "Missing pin: Menzoberranzan", "body": "Add it."})
        prompt = client.messages.create.call_args.kwargs["messages"][0]["content"]
        self.assertIn("Add a new database pin for the missing location.", prompt)

    def test_drafts_name_mismatch_issue(self):
        client = self._client_returning("Name mismatch", "Rename it.")
        result = Command._draft_issue(client, kind="name_mismatch", detail="names differ")
        self.assertEqual(result, {"title": "Name mismatch", "body": "Rename it."})
        prompt = client.messages.create.call_args.kwargs["messages"][0]["content"]
        self.assertIn("Rename the database pin", prompt)
