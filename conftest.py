"""Root conftest — ensures the project root is on sys.path so 'backend' is importable."""
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).parent))
