import io
from contextlib import redirect_stdout
from unittest.mock import MagicMock, patch

from django.test import TestCase

from ..management.commands.analyze_map import Command


class AnalyzeMapPostIssuesTest(TestCase):
    @patch("requests.post")
    @patch.object(Command, "_draft_issue")
    def test_posts_an_issue_for_each_missing_and_mismatched_entry(self, mock_draft, mock_post):
        mock_draft.return_value = {"title": "t", "body": "b"}
        mock_post.return_value = MagicMock(json=lambda: {"html_url": "https://github.com/example/issues/1"})

        missing = [{"name": "Menzoberranzan", "x": 0.2, "y": 0.3}]
        mismatched = [
            {"map_name": "Menzoberranzan", "db_name": "Blingdenstone", "db_id": 1, "distance": 0.01}
        ]

        buf = io.StringIO()
        with redirect_stdout(buf), patch.dict("os.environ", {"GITHUB_TOKEN": "test-token-placeholder"}):
            Command()._post_issues(client=MagicMock(), missing=missing, mismatched=mismatched, map_name="underdark")

        self.assertEqual(mock_post.call_count, 2)
        first_call = mock_post.call_args_list[0]
        self.assertEqual(first_call.kwargs["headers"]["Authorization"], "token test-token-placeholder")
        self.assertIn("Issue created: https://github.com/example/issues/1", buf.getvalue())
