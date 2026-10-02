"""Small Vercel entrypoint.

The real FastAPI setup stays in app/main.py. This file only exists because the
Vercel Python runtime looks for a function-style entry under api/.
"""

from app.main import app
