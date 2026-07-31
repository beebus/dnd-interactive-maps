import tempfile
from pathlib import Path

from django.test import TestCase

from ..management.commands.analyze_map import Command


class AnalyzeMapJpegDimensionsTest(TestCase):
    @staticmethod
    def _minimal_sof0_jpeg(width: int, height: int) -> bytes:
        return bytes([
            0xFF, 0xD8,  # SOI
            0xFF, 0xC0,  # SOF0 marker
            0x00, 0x0B,  # segment length
            0x08,  # precision
            (height >> 8) & 0xFF, height & 0xFF,
            (width >> 8) & 0xFF, width & 0xFF,
            0x03,  # number of components
            0x00, 0x00, 0x00,
        ])

    def test_reads_width_and_height_from_sof0_marker(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "test.jpg"
            path.write_bytes(self._minimal_sof0_jpeg(width=600, height=400))
            w, h = Command._jpeg_dimensions(path)
        self.assertEqual((w, h), (600, 400))

    def test_raises_value_error_when_no_sof_marker_present(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "bad.jpg"
            path.write_bytes(bytes([0xFF, 0xD8, 0xFF, 0xD9]))  # SOI + EOI, no SOF
            with self.assertRaises(ValueError):
                Command._jpeg_dimensions(path)
