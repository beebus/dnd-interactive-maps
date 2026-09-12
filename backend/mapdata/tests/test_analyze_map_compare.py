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

    def test_prefers_name_match_over_closer_wrong_name_pin(self):
        # A dense cluster: the positionally-nearest pin has a different name, but the
        # correctly-named pin is only slightly further away, still within the relaxed
        # radius (3x threshold). It should win, and report no issue.
        image_locs = [self._img("Menzoberranzan", 0.20, 0.30)]
        db_locs = [
            self._db(1, "Blingdenstone", 0.21, 0.31),  # closer, wrong name
            self._db(2, "Menzoberranzan", 0.25, 0.35),  # further, matching name
        ]
        missing, mismatched = Command._compare(image_locs, db_locs, threshold=0.06)
        self.assertEqual(missing, [])
        self.assertEqual(mismatched, [])

    def test_name_match_beyond_relaxed_radius_does_not_win(self):
        # The matching-name pin is too far away (beyond 3x threshold) to trust, so the
        # nearest (wrongly-named) pin is used and reported as a mismatch instead.
        image_locs = [self._img("Menzoberranzan", 0.20, 0.30)]
        db_locs = [
            self._db(1, "Blingdenstone", 0.21, 0.31),  # close, wrong name
            self._db(2, "Menzoberranzan", 0.80, 0.80),  # far, matching name
        ]
        missing, mismatched = Command._compare(image_locs, db_locs, threshold=0.06)
        self.assertEqual(missing, [])
        self.assertEqual(len(mismatched), 1)
        self.assertEqual(mismatched[0]["db_name"], "Blingdenstone")
