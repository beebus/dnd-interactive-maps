import json
import tempfile
from pathlib import Path
from unittest.mock import patch

from django.test import TestCase

from ..management.commands.analyze_map import Command


class AnalyzeMapLoadExceptionsTest(TestCase):
    def test_reads_exceptions_for_map_key(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "analyze_map_exceptions.json"
            path.write_text(json.dumps({"underdark": ["Faerûn's Underdark"]}))
            with patch("mapdata.management.commands.analyze_map.EXCEPTIONS_PATH", path):
                self.assertEqual(Command._load_exceptions("underdark"), ["Faerûn's Underdark"])

    def test_returns_empty_list_for_unlisted_map_key(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "analyze_map_exceptions.json"
            path.write_text(json.dumps({"underdark": ["Faerûn's Underdark"]}))
            with patch("mapdata.management.commands.analyze_map.EXCEPTIONS_PATH", path):
                self.assertEqual(Command._load_exceptions("elturel"), [])

    def test_returns_empty_list_when_file_missing(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "does_not_exist.json"
            with patch("mapdata.management.commands.analyze_map.EXCEPTIONS_PATH", path):
                self.assertEqual(Command._load_exceptions("underdark"), [])
