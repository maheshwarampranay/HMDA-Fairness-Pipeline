import os
import subprocess
import sys
import time

def ensure_backend_requirements(backend_dir):
    print("[0/2] Verifying Python package dependencies...")
    requirements_file = os.path.join(backend_dir, "requirements.txt")
    try:
        import fastapi
        import uvicorn
        import pandas
        import sklearn
    except ImportError:
        print("Missing required Python packages. Installing from requirements.txt...")
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-r", requirements_file]
        )
        print("✔ Python dependencies installed successfully.")

def main():
    print("=" * 60)
    print("      LLOYDS HMDA BIAS & FAIRNESS PIPELINE STARTER")
    print("=" * 60)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    frontend_dir = os.path.join(base_dir, "frontend")

    ensure_backend_requirements(backend_dir)

    print("\n[1/2] Launching FastAPI Backend on http://localhost:8000 ...")
    backend_proc = subprocess.Popen(
        [sys.executable, "run.py"],
        cwd=backend_dir
    )

    time.sleep(2)

    print("\n[2/2] Launching Vite React Frontend on http://localhost:3000 ...")
    frontend_proc = subprocess.Popen(
        "npm run dev",
        cwd=frontend_dir,
        shell=True
    )

    print("\n[OK] Application running! Access the UI at: http://localhost:3000")
    print("Press Ctrl+C to terminate both servers.")

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down services...")
        backend_proc.terminate()
        frontend_proc.terminate()

if __name__ == "__main__":
    main()
