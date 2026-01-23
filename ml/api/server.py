"""
FolliCore ML API Server

Main entry point for the ML API server.
Runs FastAPI (REST) and gRPC servers concurrently.

Architecture (per research findings):
    - FastAPI: Web-facing, auth, metrics, docs (port 8000)
    - gRPC: Service-to-service, ML inference (port 50051)

References:
    - FastAPI + gRPC Pattern: https://blog.poespas.me/posts/2025/03/04/optimizing-fastapi-grpc-large-scale-distributed-systems/
    - gRPC AsyncIO: https://grpc.github.io/grpc/python/grpc_asyncio.html
    - Kubernetes Health Probes: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/

Usage:
    # Development
    python -m api.server

    # Production
    uvicorn api.server:app --host 0.0.0.0 --port 8000 --workers 4
"""

import asyncio
import logging
import signal
import sys
import time
from contextlib import asynccontextmanager
from datetime import datetime
from typing import AsyncGenerator, Dict, Any, Optional

import grpc
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .config import get_config, Config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("follicore.api")


# ============================================================================
# PYDANTIC MODELS FOR REST API
# ============================================================================

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    timestamp: str
    version: str
    uptime_seconds: float


class ModelStatusResponse(BaseModel):
    """Model status response."""
    model_id: str
    model_name: str
    state: str
    ready: bool
    device: Optional[str] = None
    memory_mb: Optional[float] = None


class ModelsReadyResponse(BaseModel):
    """Models ready response."""
    ready: bool
    models: list[ModelStatusResponse]
    timestamp: str


class SystemStatusResponse(BaseModel):
    """System status response."""
    state: str
    version: str
    uptime_seconds: float
    models_ready: bool
    cpu_percent: Optional[float] = None
    memory_percent: Optional[float] = None
    gpu_available: bool = False
    gpu_memory_used_mb: Optional[float] = None


# ============================================================================
# APPLICATION STATE
# ============================================================================

class AppState:
    """Application state container."""

    def __init__(self):
        self.start_time = time.time()
        self.grpc_server: Optional[grpc.aio.Server] = None
        self.models_loaded = False
        self.shutdown_event = asyncio.Event()

        # Model registry (will be populated by model loader)
        self.loaded_models: Dict[str, Any] = {}

    @property
    def uptime_seconds(self) -> float:
        return time.time() - self.start_time


app_state = AppState()


# ============================================================================
# GRPC SERVER
# ============================================================================

async def create_grpc_server(config: Config) -> grpc.aio.Server:
    """Create and configure the gRPC server."""
    server = grpc.aio.server(
        options=[
            ('grpc.max_send_message_length', config.server.grpc_max_message_size),
            ('grpc.max_receive_message_length', config.server.grpc_max_message_size),
            ('grpc.keepalive_time_ms', 10000),
            ('grpc.keepalive_timeout_ms', 5000),
            ('grpc.keepalive_permit_without_calls', True),
        ]
    )

    # Add service implementations
    # These will be imported from grpc_services.py once proto compilation is done
    # For now, we add placeholder health service

    # Add insecure port (TLS would be configured for production)
    listen_addr = f"{config.server.grpc_host}:{config.server.grpc_port}"
    server.add_insecure_port(listen_addr)

    logger.info(f"gRPC server configured on {listen_addr}")
    return server


async def start_grpc_server(config: Config) -> None:
    """Start the gRPC server."""
    app_state.grpc_server = await create_grpc_server(config)
    await app_state.grpc_server.start()
    logger.info("gRPC server started")


async def stop_grpc_server() -> None:
    """Stop the gRPC server gracefully."""
    if app_state.grpc_server:
        await app_state.grpc_server.stop(grace=5.0)
        logger.info("gRPC server stopped")


# ============================================================================
# MODEL LOADING
# ============================================================================

async def load_models(config: Config) -> None:
    """
    Load ML models into memory.

    Per research: Model loading can take minutes for large models.
    Use startup probes in Kubernetes to handle this.
    """
    logger.info("Loading ML models...")

    try:
        # Placeholder for actual model loading
        # This will be implemented when we have the model inference code
        # For now, simulate loading delay

        # In production, this would:
        # 1. Load DINOv2 model (PyTorch or ONNX)
        # 2. Load MedSAM2 model (future)
        # 3. Load OpenBEATs model (future)
        # 4. Move models to GPU
        # 5. Run warmup inference

        app_state.loaded_models["dinov2"] = {
            "model_id": "dinov2-base",
            "model_name": "facebook/dinov2-base",
            "state": "ready",
            "device": config.model.device,
        }

        app_state.models_loaded = True
        logger.info("ML models loaded successfully")

    except Exception as e:
        logger.error(f"Failed to load ML models: {e}")
        raise


async def unload_models() -> None:
    """Unload ML models from memory."""
    logger.info("Unloading ML models...")
    app_state.loaded_models.clear()
    app_state.models_loaded = False


# ============================================================================
# FASTAPI APPLICATION
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan handler.

    Manages startup and shutdown of:
    - gRPC server
    - ML models
    - Background tasks
    """
    config = get_config()

    # Startup
    logger.info("Starting FolliCore ML API...")

    # Start gRPC server in background
    asyncio.create_task(start_grpc_server(config))

    # Load ML models
    await load_models(config)

    logger.info("FolliCore ML API started successfully")

    yield

    # Shutdown
    logger.info("Shutting down FolliCore ML API...")
    app_state.shutdown_event.set()
    await stop_grpc_server()
    await unload_models()
    logger.info("FolliCore ML API shut down")


# Create FastAPI application
app = FastAPI(
    title="FolliCore ML API",
    description="Machine Learning API for hair analysis",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Add CORS middleware
config = get_config()
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.security.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# HEALTH ENDPOINTS (Kubernetes Probes)
# ============================================================================

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check() -> HealthResponse:
    """
    Liveness probe endpoint.

    Returns OK if the server process is running.
    Does NOT verify models are loaded (use /ready for that).
    """
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        version="1.0.0",
        uptime_seconds=app_state.uptime_seconds,
    )


@app.get("/ready", response_model=ModelsReadyResponse, tags=["Health"])
async def readiness_check() -> ModelsReadyResponse:
    """
    Readiness probe endpoint.

    Returns OK only if models are loaded and ready to serve.
    Per research: This is critical for ML services to avoid
    routing traffic before models are loaded.
    """
    models = [
        ModelStatusResponse(
            model_id=info.get("model_id", "unknown"),
            model_name=info.get("model_name", "unknown"),
            state=info.get("state", "unknown"),
            ready=info.get("state") == "ready",
            device=info.get("device"),
        )
        for info in app_state.loaded_models.values()
    ]

    return ModelsReadyResponse(
        ready=app_state.models_loaded,
        models=models,
        timestamp=datetime.utcnow().isoformat(),
    )


@app.get("/startup", tags=["Health"])
async def startup_check() -> Dict[str, Any]:
    """
    Startup probe endpoint.

    For Kubernetes startup probes.
    Returns OK once initial startup is complete.
    """
    # Startup is complete once models are loaded
    if not app_state.models_loaded:
        raise HTTPException(
            status_code=503,
            detail="Models still loading"
        )

    return {
        "status": "started",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/status", response_model=SystemStatusResponse, tags=["Health"])
async def system_status() -> SystemStatusResponse:
    """Get comprehensive system status."""
    import psutil

    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()

    # Check GPU availability
    gpu_available = False
    gpu_memory_used_mb = None

    try:
        import torch
        if torch.cuda.is_available():
            gpu_available = True
            gpu_memory_used_mb = torch.cuda.memory_allocated() / (1024 * 1024)
    except ImportError:
        pass

    return SystemStatusResponse(
        state="healthy" if app_state.models_loaded else "starting",
        version="1.0.0",
        uptime_seconds=app_state.uptime_seconds,
        models_ready=app_state.models_loaded,
        cpu_percent=cpu_percent,
        memory_percent=memory.percent,
        gpu_available=gpu_available,
        gpu_memory_used_mb=gpu_memory_used_mb,
    )


# ============================================================================
# METRICS ENDPOINT
# ============================================================================

@app.get("/metrics", tags=["Metrics"])
async def prometheus_metrics() -> Response:
    """
    Prometheus metrics endpoint.

    Exposes metrics in Prometheus format for monitoring.
    """
    # Basic metrics (would use prometheus_client in production)
    metrics = []

    # Uptime
    metrics.append(f'follicore_uptime_seconds {app_state.uptime_seconds}')

    # Models loaded
    models_loaded = 1 if app_state.models_loaded else 0
    metrics.append(f'follicore_models_loaded {models_loaded}')

    # Model count
    metrics.append(f'follicore_models_count {len(app_state.loaded_models)}')

    return Response(
        content="\n".join(metrics),
        media_type="text/plain; version=0.0.4; charset=utf-8",
    )


# ============================================================================
# API ENDPOINTS (REST alternatives to gRPC)
# ============================================================================

@app.get("/v1/models", tags=["Models"])
async def list_models() -> Dict[str, Any]:
    """List available models."""
    return {
        "models": list(app_state.loaded_models.values()),
        "count": len(app_state.loaded_models),
    }


@app.get("/v1/models/{model_id}", tags=["Models"])
async def get_model(model_id: str) -> Dict[str, Any]:
    """Get model information."""
    if model_id not in app_state.loaded_models:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")

    return app_state.loaded_models[model_id]


# ============================================================================
# REQUEST LOGGING MIDDLEWARE
# ============================================================================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log requests for audit trail (HIPAA compliance)."""
    start_time = time.time()

    # Generate request ID
    request_id = request.headers.get("X-Request-ID", str(time.time_ns()))

    # Log request (without body for PHI protection)
    logger.info(
        f"Request started",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "client_ip": request.client.host if request.client else "unknown",
        }
    )

    response = await call_next(request)

    # Log response
    duration_ms = (time.time() - start_time) * 1000
    logger.info(
        f"Request completed",
        extra={
            "request_id": request_id,
            "status_code": response.status_code,
            "duration_ms": round(duration_ms, 2),
        }
    )

    # Add timing header
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = str(round(duration_ms, 2))

    return response


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)

    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "message": "An internal error occurred",
            "timestamp": datetime.utcnow().isoformat(),
        }
    )


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def main():
    """Main entry point for running the server."""
    import uvicorn

    config = get_config()

    logger.info("Starting FolliCore ML API Server")
    logger.info(f"REST API: http://{config.server.rest_host}:{config.server.rest_port}")
    logger.info(f"gRPC: {config.server.grpc_host}:{config.server.grpc_port}")

    uvicorn.run(
        "api.server:app",
        host=config.server.rest_host,
        port=config.server.rest_port,
        reload=False,
        log_level="info",
    )


if __name__ == "__main__":
    main()
