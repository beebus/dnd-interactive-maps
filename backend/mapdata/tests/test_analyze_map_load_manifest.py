import json
import tempfile
from pathlib import Path

from django.test import TestCase

from ..management.commands.analyze_map import Command


class AnalyzeMapLoadManifestTest(TestCase):
    def test_reads_manifest_json(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            manifest_path = Path(tmpdir) / "mapManifest.json"
            manifest_path.write_text(json.dumps({"underdark": "Underdark_1.jpg"}))
            self.assertEqual(Command._load_manifest(manifest_path), {"underdark": "Underdark_1.jpg"})

    def test_returns_empty_dict_when_manifest_missing(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            self.assertEqual(Command._load_manifest(Path(tmpdir) / "mapManifest.json"), {})
