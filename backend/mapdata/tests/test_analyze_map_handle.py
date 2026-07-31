import io
from contextlib import redirect_stdout
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from ..management.commands.analyze_map import Command
from ..models import Location


class AnalyzeMapHandleTest(TestCase):
    def setUp(self):
        Location.objects.create(name="Menzoberranzan", x=300, y=200, map="underdark")
        self.patches = [
            patch("anthropic.Anthropic"),
            patch.object(Command, "_resolve_image"),
            patch.object(Command, "_image_dimensions", return_value=(1200, 800)),
            patch.object(Command, "_vision_extract", return_value=[{"name": "Blingdenstone", "x": 0.5, "y": 0.5}]),
        ]
        self.mocks = [p.start() for p in self.patches]
        for p in self.patches:
            self.addCleanup(p.stop)
        self.mock_resolve_image = self.mocks[1]
        self.mock_resolve_image.return_value.exists.return_value = True

    def test_reports_missing_location_from_vision_extract(self):
        buf = io.StringIO()
        with redirect_stdout(buf):
            call_command("analyze_map", map="underdark")
        self.assertIn("Claude identified 1 locations", buf.getvalue())
        self.assertIn("1 MISSING pin(s)", buf.getvalue())

    def test_returns_early_when_image_missing(self):
        self.mock_resolve_image.return_value.exists.return_value = False
        buf = io.StringIO()
        with redirect_stdout(io.StringIO()):
            call_command("analyze_map", map="underdark", stderr=buf)
        self.assertIn("Map image not found", buf.getvalue())

    @patch.object(Command, "_create_pins")
    def test_create_pins_flag_invokes_create_pins_with_missing_locations(self, mock_create_pins):
        with redirect_stdout(io.StringIO()):
            call_command("analyze_map", map="underdark", create_pins=True)
        mock_create_pins.assert_called_once()
        missing_arg = mock_create_pins.call_args[0][0]
        self.assertEqual(missing_arg[0]["name"], "Blingdenstone")

    @patch.object(Command, "_post_issues")
    def test_create_issues_flag_invokes_post_issues_when_inconsistencies_found(self, mock_post_issues):
        with redirect_stdout(io.StringIO()):
            call_command("analyze_map", map="underdark", create_issues=True)
        mock_post_issues.assert_called_once()

    @patch.object(Command, "_post_issues")
    def test_create_issues_flag_skipped_when_no_inconsistencies(self, mock_post_issues):
        self.mocks[3].return_value = [{"name": "Menzoberranzan", "x": 0.25, "y": 0.25}]
        with redirect_stdout(io.StringIO()):
            call_command("analyze_map", map="underdark", create_issues=True)
        mock_post_issues.assert_not_called()
