import struct
import tempfile
from pathlib import Path

from django.test import TestCase

from ..management.commands.analyze_map import Command


class AnalyzeMapWebpDimensionsTest(TestCase):
    @staticmethod
    def _riff_wrap(fourcc: bytes, payload: bytes) -> bytes:
        chunk = fourcc + struct.pack("<I", len(payload)) + payload
        return b"RIFF" + struct.pack("<I", 4 + len(chunk)) + b"WEBP" + chunk

    def test_reads_dimensions_from_vp8x_extended_chunk(self):
        width, height = 800, 600
        payload = (
            b"\x00"
            + b"\x00\x00\x00"
            + (width - 1).to_bytes(3, "little")
            + (height - 1).to_bytes(3, "little")
        )
        data = self._riff_wrap(b"VP8X", payload)
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "test.webp"
            path.write_bytes(data)
            w, h = Command._webp_dimensions(path)
        self.assertEqual((w, h), (width, height))

    def test_reads_dimensions_from_vp8l_lossless_chunk(self):
        width, height = 800, 600
        bits = (width - 1) | ((height - 1) << 14)
        payload = b"\x2f" + struct.pack("<I", bits)
        data = self._riff_wrap(b"VP8L", payload)
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "test.webp"
            path.write_bytes(data)
            w, h = Command._webp_dimensions(path)
        self.assertEqual((w, h), (width, height))

    def test_reads_dimensions_from_vp8_lossy_chunk(self):
        width, height = 800, 600
        payload = (
            b"\x00\x00\x00"  # frame tag
            + b"\x9d\x01\x2a"  # start code
            + struct.pack("<H", width & 0x3FFF)
            + struct.pack("<H", height & 0x3FFF)
        )
        data = self._riff_wrap(b"VP8 ", payload)
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "test.webp"
            path.write_bytes(data)
            w, h = Command._webp_dimensions(path)
        self.assertEqual((w, h), (width, height))

    def test_raises_value_error_on_bad_vp8_start_code(self):
        payload = b"\x00\x00\x00" + b"\x00\x00\x00" + b"\x00\x00\x00\x00"
        data = self._riff_wrap(b"VP8 ", payload)
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "test.webp"
            path.write_bytes(data)
            with self.assertRaises(ValueError):
                Command._webp_dimensions(path)
