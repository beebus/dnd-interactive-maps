from django.test import TestCase

from ..management.commands.analyze_map import Command


class AnalyzeMapCompareTest(TestCase):
    @staticmethod
    def _img(name, x, y):
        return {"name": name, "x": x, "y": y}

    @staticmethod
    def _db(pk, name, x, y):
        return {"id": pk, "name": name, "x": x, "y": y}

    def test_missing_when_no_nearby_pin(self):
        image_locs = [self._img("Menzoberranzan", 0.2, 0.3)]
        db_locs = [self._db(1, "Menzoberranzan", 0.9, 0.9)]
        missing, mismatched = Command._compare(image_locs, db_locs, threshold=0.06)
        self.assertEqual(len(missing), 1)
        self.assertEqual(missing[0]["name"], "Menzoberranzan")
        self.assertEqual(len(mismatched), 0)

    def test_no_issue_when_nearby_and_matching_name(self):
        image_locs = [self._img("Menzoberranzan", 0.2, 0.3)]
        db_locs = [self._db(1, "Menzoberranzan", 0.21, 0.31)]
        missing, mismatched = Command._compare(image_locs, db_locs, threshold=0.06)
        self.assertEqual(len(missing), 0)
        self.assertEqual(len(mismatched), 0)

    def test_mismatched_when_nearby_but_different_name(self):
        image_locs = [self._img("Menzoberranzan", 0.2, 0.3)]
        db_locs = [self._db(1, "Blingdenstone", 0.21, 0.31)]
        missing, mismatched = Command._compare(image_locs, db_locs, threshold=0.06)
        self.assertEqual(len(missing), 0)
        self.assertEqual(len(mismatched), 1)
        self.assertEqual(mismatched[0]["map_name"], "Menzoberranzan")
        self.assertEqual(mismatched[0]["db_name"], "Blingdenstone")

    def test_all_missing_when_db_is_empty(self):
        image_locs = [self._img("Menzoberranzan", 0.2, 0.3), self._img("Blingdenstone", 0.5, 0.5)]
        missing, mismatched = Command._compare(image_locs, [], threshold=0.06)
        self.assertEqual(len(missing), 2)
        self.assertEqual(len(mismatched), 0)

    def test_empty_image_locs_returns_no_issues(self):
        db_locs = [self._db(1, "Menzoberranzan", 0.2, 0.3)]
        missing, mismatched = Command._compare([], db_locs, threshold=0.06)
        self.assertEqual(len(missing), 0)
        self.assertEqual(len(mismatched), 0)
