import graphene
from graphene_django.types import DjangoObjectType
from mapdata.models import Location, PointOfInterest


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
        loc = Location(name=name, x=x, y=y, map=map_name)
        loc.save()
        return CreateLocation(location=loc)  # type: ignore


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


schema = graphene.Schema(query=Query, mutation=Mutation)
