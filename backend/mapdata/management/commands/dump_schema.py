"""
Django management command: dump_schema

Prints the GraphQL SDL for the live backend schema (backend/backend/schema.py)
to stdout. Used by the graphql-schema-check CI workflow to diff the real
schema against the checked-in frontend snapshot (frontend/src/schema.graphql)
and catch drift.
"""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Print the backend GraphQL schema as SDL."

    def handle(self, *args, **options):
        from backend.schema import schema

        self.stdout.write(str(schema))
