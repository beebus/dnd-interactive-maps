import io
from contextlib import redirect_stdout

from django.test import TestCase

from ..management.commands.analyze_map import Command


class AnalyzeMapPrintReportTest(TestCase):
    def test_reports_no_inconsistencies(self):
        buf = io.StringIO()
        with redirect_stdout(buf):
            Command()._print_report([], [])
        self.assertIn("No inconsistencies found.", buf.getvalue())

    def test_reports_missing_pins(self):
        missing = [{"name": "Menzoberranzan", "x": 0.2, "y": 0.3}]
        buf = io.StringIO()
        with redirect_stdout(buf):
            Command()._print_report(missing, [])
        output = buf.getvalue()
        self.assertIn("1 MISSING pin(s)", output)
        self.assertIn("Menzoberranzan", output)

    def test_reports_mismatched_pins(self):
        mismatched = [{"map_name": "Menzoberranzan", "db_name": "Blingdenstone", "db_id": 1, "distance": 0.01}]
        buf = io.StringIO()
        with redirect_stdout(buf):
            Command()._print_report([], mismatched)
        output = buf.getvalue()
        self.assertIn("1 NAME MISMATCH(ES)", output)
        self.assertIn("Menzoberranzan", output)
        self.assertIn("Blingdenstone", output)
