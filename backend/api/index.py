"""Point d'entrée Vercel (Python serverless).

Le runtime Python de Vercel sert automatiquement, comme application ASGI, la
variable `app` exposée par ce fichier. On réutilise tel quel l'app FastAPI
définie dans server.py (à la racine du dossier backend/), sans la dupliquer.
"""
import os
import sys

# server.py est un cran au-dessus de api/ ; on l'ajoute au chemin d'import.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import app  # noqa: E402  (importé après l'ajustement de sys.path)
