import subprocess
import sys

REQUIRED_PACKAGES = [
    "fastapi>=0.100.0",
    "uvicorn[standard]>=0.20.0",
    "pandas>=2.0.0",
    "numpy>=1.24.0",
    "scikit-learn>=1.2.0",
    "xgboost>=2.0.0",
    "fairlearn>=0.10.0",
    "matplotlib>=3.7.0",
    "seaborn>=0.12.0",
    "python-multipart>=0.0.6",
    "ucimlrepo>=0.0.6",
    "requests>=2.28.0"
]

def install_requirements():
    print("=" * 60)
    print("  LLOYDS FAIRNESS PIPELINE - PYTHON REQUIREMENTS INSTALLER")
    print("=" * 60)
    print("\n[+] Verifying and installing required Python packages...\n")
    
    for package in REQUIRED_PACKAGES:
        pkg_name = package.split(">=")[0].split("[")[0]
        try:
            __import__(pkg_name.replace("-", "_"))
            print(f"  [OK] {pkg_name} is already installed.")
        except ImportError:
            print(f"  [+] Installing {package}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
            print(f"  [OK] {package} installed successfully.")

    print("\n[OK] All Python dependencies are satisfied!")

if __name__ == "__main__":
    install_requirements()
