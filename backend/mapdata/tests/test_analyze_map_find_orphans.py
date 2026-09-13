from django.test import TestCase

from ..management.commands.analyze_map import Command


class AnalyzeMapFindOrphansTest(TestCase):
    @staticmethod
    def _img(name, x, y):
        return {"name": name, "x": x, "y": y}

    @staticmethod
    def _db(pk, name, x, y):
        return {"id": pk, "name": name, "x": x, "y": y}

    def test_no_orphans_when_every_pin_has_a_matching_label(self):
        db_locs = [self._db(1, "Menzoberranzan", 0.2, 0.3)]
        image_locs = [self._img("Menzoberranzan", 0.21, 0.31)]
        self.assertEqual(Command._find_orphans(db_locs, image_locs, threshold=0.06), [])

    def test_pin_with_no_nearby_label_is_orphaned(self):
        db_locs = [self._db(1, "Elturel", 0.1, 0.1)]
        image_locs = [self._img("Maiden's Leap", 0.8, 0.8)]
        orphans = Command._find_orphans(db_locs, image_locs, threshold=0.06)
        self.assertEqual(len(orphans), 1)
        self.assertEqual(orphans[0]["name"], "Elturel")

    def test_all_pins_orphaned_when_image_has_no_labels(self):
        db_locs = [self._db(1, "Menzoberranzan", 0.2, 0.3), self._db(2, "Blingdenstone", 0.5, 0.5)]
        self.assertEqual(len(Command._find_orphans(db_locs, [], threshold=0.06)), 2)

    def test_pin_matched_positionally_despite_different_name_is_not_orphaned(self):
        # Nearby label with a different name is a MISMATCH (handled by _compare), not an orphan.
        db_locs = [self._db(1, "Blingdenstone", 0.21, 0.31)]
        image_locs = [self._img("Menzoberranzan", 0.20, 0.30)]
        self.assertEqual(Command._find_orphans(db_locs, image_locs, threshold=0.06), [])

    def test_pin_matched_by_name_beyond_normal_threshold_but_within_relaxed_radius(self):
        db_locs = [self._db(1, "Menzoberranzan", 0.20, 0.30)]
        image_locs = [self._img("Menzoberranzan", 0.25, 0.35)]
        self.assertEqual(Command._find_orphans(db_locs, image_locs, threshold=0.06), [])
