#!/usr/bin/env python3
"""
Protocol Buffers Compilation Script

Compiles .proto files and generates:
- Python gRPC stubs (for ML API server)
- TypeScript definitions (for FolliCore TypeScript client)

Usage:
    python scripts/compile_protos.py
    python scripts/compile_protos.py --typescript
    python scripts/compile_protos.py --python

References:
- gRPC Python: https://grpc.io/docs/languages/python/quickstart/
- Protocol Buffers: https://protobuf.dev/getting-started/pythontutorial/
"""

import argparse
import subprocess
import sys
from pathlib import Path

# Paths
SCRIPT_DIR = Path(__file__).parent
ML_DIR = SCRIPT_DIR.parent
PROTOS_DIR = ML_DIR / "protos"
PYTHON_OUT_DIR = ML_DIR / "api" / "generated"
TYPESCRIPT_OUT_DIR = ML_DIR.parent / "src" / "generated" / "grpc"


def compile_python() -> bool:
    """Compile Protocol Buffers for Python."""
    print("Compiling Protocol Buffers for Python...")

    # Create output directory
    PYTHON_OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Find all .proto files
    proto_files = list(PROTOS_DIR.glob("*.proto"))
    if not proto_files:
        print("ERROR: No .proto files found in", PROTOS_DIR)
        return False

    print(f"Found {len(proto_files)} proto files:")
    for f in proto_files:
        print(f"  - {f.name}")

    # Compile each proto file
    for proto_file in proto_files:
        cmd = [
            sys.executable, "-m", "grpc_tools.protoc",
            f"--proto_path={PROTOS_DIR}",
            f"--python_out={PYTHON_OUT_DIR}",
            f"--pyi_out={PYTHON_OUT_DIR}",  # Type stubs
            f"--grpc_python_out={PYTHON_OUT_DIR}",
            str(proto_file),
        ]

        print(f"\nCompiling {proto_file.name}...")
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            print(f"ERROR compiling {proto_file.name}:")
            print(result.stderr)
            return False

    # Create __init__.py
    init_file = PYTHON_OUT_DIR / "__init__.py"
    init_content = '''"""
FolliCore gRPC Generated Code

Auto-generated from Protocol Buffers.
DO NOT EDIT MANUALLY.

Regenerate with: python scripts/compile_protos.py
"""

# Import all generated modules
from . import follicore_pb2
from . import follicore_pb2_grpc
from . import vision_pb2
from . import vision_pb2_grpc
from . import acoustic_pb2
from . import acoustic_pb2_grpc
from . import health_pb2
from . import health_pb2_grpc

__all__ = [
    "follicore_pb2",
    "follicore_pb2_grpc",
    "vision_pb2",
    "vision_pb2_grpc",
    "acoustic_pb2",
    "acoustic_pb2_grpc",
    "health_pb2",
    "health_pb2_grpc",
]
'''
    init_file.write_text(init_content)

    # Fix imports (proto compiler generates absolute imports, we need relative)
    fix_python_imports(PYTHON_OUT_DIR)

    print(f"\nPython stubs generated in: {PYTHON_OUT_DIR}")
    return True


def fix_python_imports(output_dir: Path) -> None:
    """
    Fix import statements in generated Python files.

    The protoc compiler generates absolute imports like:
        import follicore_pb2 as follicore__pb2

    We need relative imports:
        from . import follicore_pb2 as follicore__pb2
    """
    print("\nFixing Python imports...")

    for py_file in output_dir.glob("*_pb2*.py"):
        if py_file.name == "__init__.py":
            continue

        content = py_file.read_text()
        original_content = content

        # Fix import statements
        # Pattern: import X_pb2 as X__pb2
        import_fixes = [
            ("import follicore_pb2", "from . import follicore_pb2"),
            ("import vision_pb2", "from . import vision_pb2"),
            ("import acoustic_pb2", "from . import acoustic_pb2"),
            ("import health_pb2", "from . import health_pb2"),
        ]

        for old, new in import_fixes:
            content = content.replace(old, new)

        if content != original_content:
            py_file.write_text(content)
            print(f"  Fixed imports in: {py_file.name}")


def compile_typescript() -> bool:
    """
    Compile Protocol Buffers for TypeScript.

    Requires:
    - protoc (Protocol Buffers compiler)
    - ts-proto or grpc-tools

    Install with:
        npm install -g grpc-tools grpc_tools_node_protoc_ts
        # or
        npm install ts-proto
    """
    print("Compiling Protocol Buffers for TypeScript...")

    # Create output directory
    TYPESCRIPT_OUT_DIR.mkdir(parents=True, exist_ok=True)

    proto_files = list(PROTOS_DIR.glob("*.proto"))
    if not proto_files:
        print("ERROR: No .proto files found")
        return False

    # Check for ts-proto (preferred for modern TypeScript)
    try:
        # Using ts-proto via npx
        for proto_file in proto_files:
            cmd = [
                "npx", "protoc",
                f"--plugin=protoc-gen-ts_proto=./node_modules/.bin/protoc-gen-ts_proto",
                f"--ts_proto_out={TYPESCRIPT_OUT_DIR}",
                "--ts_proto_opt=outputServices=grpc-js",
                "--ts_proto_opt=esModuleInterop=true",
                "--ts_proto_opt=env=node",
                "--ts_proto_opt=useOptionals=messages",
                f"--proto_path={PROTOS_DIR}",
                str(proto_file),
            ]

            print(f"Compiling {proto_file.name} for TypeScript...")
            result = subprocess.run(cmd, capture_output=True, text=True, shell=True)

            if result.returncode != 0:
                print(f"  Warning: ts-proto compilation failed for {proto_file.name}")
                print(f"  {result.stderr}")
                print("  Trying alternative method...")

                # Fallback to grpc-tools
                return compile_typescript_grpc_tools()

        print(f"\nTypeScript stubs generated in: {TYPESCRIPT_OUT_DIR}")
        return True

    except FileNotFoundError:
        print("  ts-proto not found, trying grpc-tools...")
        return compile_typescript_grpc_tools()


def compile_typescript_grpc_tools() -> bool:
    """
    Alternative TypeScript compilation using grpc-tools.
    """
    proto_files = list(PROTOS_DIR.glob("*.proto"))

    # Using grpc_tools_node_protoc_ts
    for proto_file in proto_files:
        cmd = [
            "npx", "grpc_tools_node_protoc",
            f"--js_out=import_style=commonjs,binary:{TYPESCRIPT_OUT_DIR}",
            f"--grpc_out=grpc_js:{TYPESCRIPT_OUT_DIR}",
            f"--ts_out=grpc_js:{TYPESCRIPT_OUT_DIR}",
            f"--proto_path={PROTOS_DIR}",
            str(proto_file),
        ]

        print(f"Compiling {proto_file.name}...")
        result = subprocess.run(cmd, capture_output=True, text=True, shell=True)

        if result.returncode != 0:
            print(f"  ERROR: {result.stderr}")
            # Don't fail - TypeScript compilation is optional for foundation

    print(f"\nTypeScript stubs (partial) in: {TYPESCRIPT_OUT_DIR}")
    print("Note: Full TypeScript generation requires npm packages.")
    print("Run: npm install ts-proto @grpc/grpc-js")
    return True


def main():
    parser = argparse.ArgumentParser(description="Compile Protocol Buffers")
    parser.add_argument("--python", action="store_true", help="Compile for Python only")
    parser.add_argument("--typescript", action="store_true", help="Compile for TypeScript only")
    args = parser.parse_args()

    # Default: compile both
    compile_py = not args.typescript or args.python
    compile_ts = not args.python or args.typescript

    success = True

    if compile_py:
        if not compile_python():
            success = False

    if compile_ts:
        if not compile_typescript():
            # Don't fail on TypeScript - it requires npm packages
            print("TypeScript compilation skipped or partial.")

    if success:
        print("\n" + "="*60)
        print("Protocol Buffers compilation complete!")
        print("="*60)
    else:
        print("\n" + "="*60)
        print("Protocol Buffers compilation FAILED")
        print("="*60)
        sys.exit(1)


if __name__ == "__main__":
    main()
