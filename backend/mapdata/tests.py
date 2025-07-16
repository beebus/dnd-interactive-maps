from django.test import TestCase
from .models import Location

class LocationModelTest(TestCase):
    def test_create_location(self):
        loc = Location.objects.create(name="Test Location", x=100, y=200)
        self.assertEqual(loc.name, "Test Location")
        self.assertEqual(loc.x, 100)
        self.assertEqual(loc.y, 200)