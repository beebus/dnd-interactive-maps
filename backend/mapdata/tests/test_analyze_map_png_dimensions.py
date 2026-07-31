import struct
import tempfile
from pathlib import Path

from django.test import TestCase

from ..management.commands.analyze_map import Command


class AnalyzeMapPngDimensionsTest(TestCase):
    @staticmethod
    def _minimal_png(width: int, height: int) -> bytes:
        return (
            b"\x89PNG\r\n\x1a\n"
            + struct.pack(">I", 13)
            + b"IHDR"
            + struct.pack(">II", width, height)
            + bytes([0x08, 0x02, 0x00, 0x00, 0x00])
            + b"\x00\x00\x00\x00"
        )

    def test_reads_width_and_height_from_ihdr_chunk(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "test.png"
            path.write_bytes(self._minimal_png(width=800, height=600))
            w, h = Command._png_dimensions(path)
        self.assertEqual((w, h), (800, 600))
