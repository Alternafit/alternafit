"""Funções para comparar textos do jeito que uma pessoa compara: sem ligar para acentos e maiúsculas."""

import re
import unicodedata


def fold(value):
    """Minúsculas, sem acentos e sem espaços sobrando: "  Flexão  de BRAÇO " -> "flexao de braco"."""
    normalized = unicodedata.normalize('NFKD', str(value or '').lower())
    normalized = ''.join(ch for ch in normalized if not unicodedata.combining(ch))
    return re.sub(r'\s+', ' ', normalized).strip()
