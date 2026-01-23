"""
FolliCore ML API Package

This package provides the ML inference API for FolliCore.
Exposes both gRPC (for TypeScript integration) and REST (for debugging/metrics).

Architecture:
    - gRPC (:50051): High-performance service-to-service communication
    - REST (:8000): Health checks, metrics, documentation

IEC 62304 Compliance:
    - This is SOUP interface layer
    - All predictions include confidence scores
    - Audit logging enabled for all requests

Version: 1.0.0
"""

__version__ = "1.0.0"
__author__ = "FolliCore Team"
