# ============================================================================
# FolliCore ML API Docker Image
# ============================================================================
#
# Multi-stage build for optimized production image.
#
# Build:
#   docker build -t follicore-ml:latest .
#
# Run:
#   docker run -p 8000:8000 -p 50051:50051 follicore-ml:latest
#
# With GPU:
#   docker run --gpus all -p 8000:8000 -p 50051:50051 follicore-ml:latest
#
# References:
# - NVIDIA Container Toolkit: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/
# - Docker Best Practices: https://docs.docker.com/develop/develop-images/dockerfile_best-practices/
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1: Builder
# ----------------------------------------------------------------------------
FROM python:3.11-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /tmp/requirements.txt

# Compile Protocol Buffers
COPY protos/ /tmp/protos/
RUN mkdir -p /tmp/generated && \
    python -m grpc_tools.protoc \
    --proto_path=/tmp/protos \
    --python_out=/tmp/generated \
    --grpc_python_out=/tmp/generated \
    /tmp/protos/*.proto

# ----------------------------------------------------------------------------
# Stage 2: Runtime (CPU)
# ----------------------------------------------------------------------------
FROM python:3.11-slim as runtime-cpu

# Labels for IEC 62304 traceability
LABEL maintainer="FolliCore Team <tech@awfond.ru>"
LABEL version="1.0.0"
LABEL description="FolliCore ML API - CPU Runtime"
LABEL iec62304.class="C"
LABEL iec62304.soup="true"

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create non-root user for security
RUN groupadd --gid 1000 follicore && \
    useradd --uid 1000 --gid follicore --shell /bin/bash --create-home follicore

# Set working directory
WORKDIR /app

# Copy application code
COPY --chown=follicore:follicore api/ /app/api/
COPY --chown=follicore:follicore models/ /app/models/
COPY --from=builder --chown=follicore:follicore /tmp/generated/ /app/generated/

# Create directories
RUN mkdir -p /app/logs /app/data && \
    chown -R follicore:follicore /app

# Switch to non-root user
USER follicore

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV FOLLICORE_DEVICE=cpu
ENV FOLLICORE_REST_PORT=8000
ENV FOLLICORE_GRPC_PORT=50051

# Expose ports
EXPOSE 8000 50051 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Entry point
CMD ["python", "-m", "api.server"]

# ----------------------------------------------------------------------------
# Stage 3: Runtime (GPU) - NVIDIA CUDA
# ----------------------------------------------------------------------------
FROM nvidia/cuda:11.8-cudnn8-runtime-ubuntu22.04 as runtime-gpu

# Labels
LABEL maintainer="FolliCore Team <tech@awfond.ru>"
LABEL version="1.0.0"
LABEL description="FolliCore ML API - GPU Runtime"
LABEL iec62304.class="C"
LABEL iec62304.soup="true"

# Install Python and dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-venv \
    python3-pip \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s /usr/bin/python3.11 /usr/bin/python

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install GPU-specific packages
RUN pip install --no-cache-dir \
    torch==2.1.0+cu118 \
    torchvision==0.16.0+cu118 \
    --index-url https://download.pytorch.org/whl/cu118 && \
    pip install --no-cache-dir onnxruntime-gpu

# Create non-root user
RUN groupadd --gid 1000 follicore && \
    useradd --uid 1000 --gid follicore --shell /bin/bash --create-home follicore

# Set working directory
WORKDIR /app

# Copy application code
COPY --chown=follicore:follicore api/ /app/api/
COPY --chown=follicore:follicore models/ /app/models/
COPY --from=builder --chown=follicore:follicore /tmp/generated/ /app/generated/

# Create directories
RUN mkdir -p /app/logs /app/data && \
    chown -R follicore:follicore /app

# Switch to non-root user
USER follicore

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV FOLLICORE_DEVICE=cuda
ENV FOLLICORE_USE_FP16=true
ENV FOLLICORE_REST_PORT=8000
ENV FOLLICORE_GRPC_PORT=50051
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

# Expose ports
EXPOSE 8000 50051 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Entry point
CMD ["python", "-m", "api.server"]
