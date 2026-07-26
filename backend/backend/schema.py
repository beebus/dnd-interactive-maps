import graphene
from django.conf import settings
from graphene_django.types import DjangoObjectType
from graphql import GraphQLError
from mapdata.models import Location, PointOfInterest


def _require_dev_mode():
    if not settings.DEBUG:
        raise GraphQLError("Map editing is only available in development.")


class LocationType(DjangoObjectType):
    class Meta:
        model = Location
        fields = ("id", "name", "x", "y", "map", "pois")


class PointOfInterestType(DjangoObjectType):
    class Meta:
        model = PointOfInterest
        fields = ("title", "description")


class CreateLocation(graphene.Mutation):
    class Arguments:
        name = graphene.String(required=True)
        x = graphene.Float(required=True)
        y = graphene.Float(required=True)
        map_name = graphene.String(required=True)

    location = graphene.Field(LocationType)

    # noinspection PyMethodMayBeStatic
    def mutate(self, info, name, x, y, map_name):  # noqa: F841
        _require_dev_mode()
        loc = Location(name=name, x=x, y=y, map=map_name)
        loc.save()
        return CreateLocation(location=loc)  # type: ignore


class UpdateLocation(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        name = graphene.String()
        x = graphene.Float()
        y = graphene.Float()

    location = graphene.Field(LocationType)

    # noinspection PyMethodMayBeStatic
    def mutate(self, info, id, name=None, x=None, y=None):  # noqa: F841
        _require_dev_mode()
        try:
            loc = Location.objects.get(pk=id)
        except Location.DoesNotExist:
            raise GraphQLError("Location not found")
        if name is not None:
            loc.name = name
        if x is not None:
            loc.x = x
        if y is not None:
            loc.y = y
        loc.save()
        return UpdateLocation(location=loc)  # type: ignore


class DeleteLocation(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    success = graphene.Boolean()
    deleted_id = graphene.ID()

    # noinspection PyMethodMayBeStatic
    def mutate(self, info, id):  # noqa: F841
        _require_dev_mode()
        try:
            loc = Location.objects.get(pk=id)
        except Location.DoesNotExist:
            raise GraphQLError("Location not found")
        loc.delete()
        return DeleteLocation(success=True, deleted_id=id)  # type: ignore


class Query(graphene.ObjectType):
    all_locations = graphene.List(LocationType, map_name=graphene.String())

    # noinspection PyMethodMayBeStatic
    def resolve_all_locations(self, info, map_name=None):  # noqa: F841
        qs = Location.objects.all()
        if map_name is not None:
            qs = qs.filter(map=map_name)
        return qs


class Mutation(graphene.ObjectType):
    create_location = CreateLocation.Field()
    update_location = UpdateLocation.Field()
    delete_location = DeleteLocation.Field()


schema = graphene.Schema(query=Query, mutation=Mutation)
