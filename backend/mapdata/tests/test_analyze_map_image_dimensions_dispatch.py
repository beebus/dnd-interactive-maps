import tempfile
from pathlib import Path

from django.test import TestCase

from ..management.commands.analyze_map import Command
from .test_analyze_map_jpeg_dimensions import AnalyzeMapJpegDimensionsTest
from .test_analyze_map_png_dimensions import AnalyzeMapPngDimensionsTest
from .test_analyze_map_webp_dimensions import AnalyzeMapWebpDimensionsTest


class AnalyzeMapImageDimensionsDispatchTest(TestCase):
    def test_dispatches_jpeg_by_magic_bytes(self):
        data = AnalyzeMapJpegDimensionsTest._minimal_sof0_jpeg(width=600, height=400)
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "test.whatever"
            path.write_bytes(data)
            self.assertEqual(Command._image_dimensions(path), (600, 400))

    def test_dispatches_png_by_magic_bytes(self):
        data = AnalyzeMapPngDimensionsTest._minimal_png(width=800, height=600)
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "test.whatever"
            path.write_bytes(data)
            self.assertEqual(Command._image_dimensions(path), (800, 600))

    def test_dispatches_webp_by_magic_bytes(self):
        payload = b"\x00" + b"\x00\x00\x00" + (799).to_bytes(3, "little") + (599).to_bytes(3, "little")
        data = AnalyzeMapWebpDimensionsTest._riff_wrap(b"VP8X", payload)
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "test.whatever"
            path.write_bytes(data)
            self.assertEqual(Command._image_dimensions(path), (800, 600))

    def test_raises_value_error_for_unsupported_format(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "test.gif"
            path.write_bytes(b"GIF89a" + b"\x00" * 20)
            with self.assertRaises(ValueError):
                Command._image_dimensions(path)
