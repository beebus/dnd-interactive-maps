import tempfile
from pathlib import Path
from unittest.mock import MagicMock

from django.test import TestCase

from ..management.commands.analyze_map import Command


class AnalyzeMapVisionExtractTest(TestCase):
    @staticmethod
    def _client_returning(text):
        client = MagicMock()
        client.messages.create.return_value = MagicMock(content=[MagicMock(text=text)])
        return client

    def test_extracts_and_normalizes_locations(self):
        client = self._client_returning(
            '[{"name": "menzoberranzan", "x": 300, "y": 200}, {"name": "the RUINS", "x": 600, "y": 400}]'
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "map.jpg"
            path.write_bytes(b"\xff\xd8fake")
            result = Command._vision_extract(client, path, img_w=1200, img_h=800)

        self.assertEqual(
            result,
            [
                {"name": "Menzoberranzan", "x": 0.25, "y": 0.25},
                {"name": "The Ruins", "x": 0.5, "y": 0.5},
            ],
        )
        call_kwargs = client.messages.create.call_args.kwargs
        self.assertEqual(call_kwargs["messages"][0]["content"][0]["source"]["media_type"], "image/jpeg")

    def test_strips_markdown_code_fences(self):
        client = self._client_returning('```json\n[{"name": "Beregost", "x": 100, "y": 50}]\n```')
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "map.png"
            path.write_bytes(b"\x89PNGfake")
            result = Command._vision_extract(client, path, img_w=200, img_h=100)

        self.assertEqual(result, [{"name": "Beregost", "x": 0.5, "y": 0.5}])

    def test_raises_value_error_on_invalid_json(self):
        client = self._client_returning("not valid json")
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "map.jpg"
            path.write_bytes(b"\xff\xd8fake")
            with self.assertRaises(ValueError):
                Command._vision_extract(client, path, img_w=1200, img_h=800)

    def test_raises_value_error_for_unsupported_extension(self):
        client = self._client_returning("[]")
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "map.gif"
            path.write_bytes(b"GIF89afake")
            with self.assertRaises(ValueError):
                Command._vision_extract(client, path, img_w=100, img_h=100)
