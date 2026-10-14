from django.db.models import Prefetch
from rest_framework import viewsets
from rest_framework.response import Response

from .models import Exercise, ExerciseAlternative, ExerciseMuscularGroup, MuscularGroup
from .serializers import ExerciseSerializer, MuscularGroupSerializer
from .text import fold


def search_relevance(exercise, term):
    """
    Quão bem o exercício combina com a busca (menor = melhor), ou None se não combina.
    Ordem: nome exato, depois nome em inglês ou apelido exato, depois "começa com", depois "contém".
    """
    name = fold(exercise.name)
    others = [fold(exercise.name_en)] + [fold(alias.alias) for alias in exercise.aliases.all()]
    if name == term:
        return 0
    if term in others:
        return 1
    if name.startswith(term):
        return 2
    if term in name or any(term in other for other in others):
        return 3
    return None


def group_role(exercise, group):
    """Papel do grupo muscular no exercício ("primary"/"secondary"), ou None se o exercício não trabalha esse grupo."""
    for link in exercise.muscular_group_links.all():
        if fold(link.muscular_group.name) == group:
            return link.role
    return None


class ExerciseViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Exercícios com suas alternativas (somente leitura).

    GET /api/exercicios/                  todos os exercícios
    GET /api/exercicios/?busca=supino     nome, nome em inglês ou apelido contém "supino" (nome exato primeiro)
    GET /api/exercicios/?grupo=Glúteos    exercícios que trabalham o grupo (foco principal primeiro)
    GET /api/exercicios/<codigo>/         um exercício específico

    A busca e o filtro ignoram acentos e maiúsculas ("flexao" encontra "Flexão"). Eles são
    feitos aqui no Python, e não no banco, para funcionar igual no MySQL e no SQLite.
    O catálogo é pequeno (algumas centenas de exercícios), então isso é rápido.
    """

    serializer_class = ExerciseSerializer

    def get_queryset(self):
        return Exercise.objects.select_related('difficulty', 'movement_pattern').prefetch_related(
            Prefetch(
                'muscular_group_links',
                queryset=ExerciseMuscularGroup.objects.select_related('muscular_group'),
            ),
            'equipment',
            'aliases',
            'steps',
            'sources',
            Prefetch(
                'alternative_links',
                queryset=ExerciseAlternative.objects.select_related('alternative__difficulty')
                .prefetch_related(
                    'alternative__equipment',
                    Prefetch(
                        'alternative__muscular_group_links',
                        queryset=ExerciseMuscularGroup.objects.select_related('muscular_group'),
                    ),
                )
                .order_by('order'),
            ),
        )

    def list(self, request, *args, **kwargs):
        search = fold(request.query_params.get('busca', ''))
        group = fold(request.query_params.get('grupo', ''))
        if not search and not group:
            exercises = sorted(self.get_queryset(), key=lambda e: fold(e.name))
            return Response(self.get_serializer(exercises, many=True).data)

        # Etapa 1: carrega só o necessário para comparar (nomes, apelidos e grupos) e escolhe os exercícios
        candidates = sorted(
            Exercise.objects.only('id', 'name', 'name_en').prefetch_related(
                'aliases',
                Prefetch(
                    'muscular_group_links',
                    queryset=ExerciseMuscularGroup.objects.select_related('muscular_group'),
                ),
            ),
            key=lambda e: fold(e.name),
        )
        if search:
            ranked = [(search_relevance(e, search), e) for e in candidates]
            candidates = [e for relevance, e in sorted(
                ((r, e) for r, e in ranked if r is not None), key=lambda pair: pair[0]
            )]
        if group:
            roles = [(group_role(e, group), e) for e in candidates]
            # Quem tem o grupo como foco principal vem primeiro; dentro de cada parte, a ordem anterior é mantida
            candidates = [e for role, e in roles if role == ExerciseMuscularGroup.Role.PRIMARY] + [
                e for role, e in roles if role == ExerciseMuscularGroup.Role.SECONDARY
            ]

        # Etapa 2: carrega os dados completos só dos exercícios escolhidos, mantendo a ordem
        ids = [e.id for e in candidates]
        full = {e.id: e for e in self.get_queryset().filter(id__in=ids)}
        exercises = [full[i] for i in ids]
        return Response(self.get_serializer(exercises, many=True).data)


class MuscularGroupViewSet(viewsets.ReadOnlyModelViewSet):
    """Grupos musculares, usados nos chips de navegação do frontend (somente leitura)."""

    serializer_class = MuscularGroupSerializer

    def get_queryset(self):
        return MuscularGroup.objects.all()

    def list(self, request, *args, **kwargs):
        # Ordem alfabética ignorando acentos, igual em qualquer banco
        groups = sorted(self.get_queryset(), key=lambda g: fold(g.name))
        return Response(self.get_serializer(groups, many=True).data)
