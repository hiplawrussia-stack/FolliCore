"""
FolliCore ML API Configuration

Centralized configuration for the ML API server.
Supports environment variables for production deployment.

References:
- 12-Factor App Config: https://12factor.net/config
- HIPAA Configuration: Sensitive data in environment, not code
"""

import os
from dataclasses import dataclass, field
from typing import Optional, List
from pathlib import Path


@dataclass
class ServerConfig:
    """Server configuration."""

    # gRPC settings
    grpc_host: str = "0.0.0.0"
    grpc_port: int = 50051
    grpc_max_workers: int = 10
    grpc_max_message_size: int = 100 * 1024 * 1024  # 100MB

    # REST/FastAPI settings
    rest_host: str = "0.0.0.0"
    rest_port: int = 8000
    rest_workers: int = 4

    # Timeouts (ms)
    request_timeout_ms: int = 30000
    model_load_timeout_ms: int = 300000  # 5 minutes for large models

    @classmethod
    def from_env(cls) -> "ServerConfig":
        """Load configuration from environment variables."""
        return cls(
            grpc_host=os.getenv("FOLLICORE_GRPC_HOST", "0.0.0.0"),
            grpc_port=int(os.getenv("FOLLICORE_GRPC_PORT", "50051")),
            grpc_max_workers=int(os.getenv("FOLLICORE_GRPC_WORKERS", "10")),
            rest_host=os.getenv("FOLLICORE_REST_HOST", "0.0.0.0"),
            rest_port=int(os.getenv("FOLLICORE_REST_PORT", "8000")),
            rest_workers=int(os.getenv("FOLLICORE_REST_WORKERS", "4")),
            request_timeout_ms=int(os.getenv("FOLLICORE_REQUEST_TIMEOUT_MS", "30000")),
        )


@dataclass
class ModelConfig:
    """Model configuration."""

    # Model paths
    models_dir: Path = field(default_factory=lambda: Path(__file__).parent.parent / "models")

    # DINOv2 settings
    dinov2_model_name: str = "facebook/dinov2-base"
    dinov2_checkpoint_path: Optional[str] = None
    dinov2_onnx_path: Optional[str] = None

    # Device settings
    device: str = "cuda"  # cuda, cpu, mps
    use_fp16: bool = True

    # Inference settings
    batch_size: int = 8
    image_size: int = 224

    # Model warmup
    warmup_iterations: int = 3

    @classmethod
    def from_env(cls) -> "ModelConfig":
        """Load configuration from environment variables."""
        models_dir = Path(os.getenv("FOLLICORE_MODELS_DIR", str(Path(__file__).parent.parent / "models")))

        return cls(
            models_dir=models_dir,
            dinov2_model_name=os.getenv("FOLLICORE_DINOV2_MODEL", "facebook/dinov2-base"),
            dinov2_checkpoint_path=os.getenv("FOLLICORE_DINOV2_CHECKPOINT"),
            dinov2_onnx_path=os.getenv("FOLLICORE_DINOV2_ONNX"),
            device=os.getenv("FOLLICORE_DEVICE", "cuda"),
            use_fp16=os.getenv("FOLLICORE_USE_FP16", "true").lower() == "true",
            batch_size=int(os.getenv("FOLLICORE_BATCH_SIZE", "8")),
            image_size=int(os.getenv("FOLLICORE_IMAGE_SIZE", "224")),
        )


@dataclass
class LoggingConfig:
    """Logging configuration for audit trail (HIPAA compliance)."""

    # Log level
    log_level: str = "INFO"

    # Log format
    log_format: str = "json"  # json or text

    # Audit logging
    enable_audit_log: bool = True
    audit_log_path: Optional[Path] = None

    # Request logging (careful with PHI)
    log_requests: bool = True
    log_request_body: bool = False  # Disable by default for PHI protection
    log_response_body: bool = False

    @classmethod
    def from_env(cls) -> "LoggingConfig":
        """Load configuration from environment variables."""
        audit_path = os.getenv("FOLLICORE_AUDIT_LOG_PATH")
        return cls(
            log_level=os.getenv("FOLLICORE_LOG_LEVEL", "INFO"),
            log_format=os.getenv("FOLLICORE_LOG_FORMAT", "json"),
            enable_audit_log=os.getenv("FOLLICORE_ENABLE_AUDIT", "true").lower() == "true",
            audit_log_path=Path(audit_path) if audit_path else None,
            log_requests=os.getenv("FOLLICORE_LOG_REQUESTS", "true").lower() == "true",
        )


@dataclass
class SecurityConfig:
    """Security configuration."""

    # TLS settings
    enable_tls: bool = False
    tls_cert_path: Optional[Path] = None
    tls_key_path: Optional[Path] = None

    # Authentication (optional)
    enable_auth: bool = False
    auth_token_header: str = "X-FolliCore-Token"

    # Rate limiting
    enable_rate_limit: bool = True
    rate_limit_requests: int = 100  # per minute
    rate_limit_window_seconds: int = 60

    # CORS (for REST API)
    cors_origins: List[str] = field(default_factory=lambda: ["*"])

    @classmethod
    def from_env(cls) -> "SecurityConfig":
        """Load configuration from environment variables."""
        tls_cert = os.getenv("FOLLICORE_TLS_CERT")
        tls_key = os.getenv("FOLLICORE_TLS_KEY")
        cors = os.getenv("FOLLICORE_CORS_ORIGINS", "*")

        return cls(
            enable_tls=os.getenv("FOLLICORE_ENABLE_TLS", "false").lower() == "true",
            tls_cert_path=Path(tls_cert) if tls_cert else None,
            tls_key_path=Path(tls_key) if tls_key else None,
            enable_auth=os.getenv("FOLLICORE_ENABLE_AUTH", "false").lower() == "true",
            enable_rate_limit=os.getenv("FOLLICORE_ENABLE_RATE_LIMIT", "true").lower() == "true",
            rate_limit_requests=int(os.getenv("FOLLICORE_RATE_LIMIT", "100")),
            cors_origins=cors.split(",") if cors else ["*"],
        )


@dataclass
class MetricsConfig:
    """Metrics and observability configuration."""

    # Prometheus metrics
    enable_metrics: bool = True
    metrics_port: int = 9090

    # Tracing (OpenTelemetry)
    enable_tracing: bool = False
    tracing_endpoint: Optional[str] = None
    service_name: str = "follicore-ml-api"

    @classmethod
    def from_env(cls) -> "MetricsConfig":
        """Load configuration from environment variables."""
        return cls(
            enable_metrics=os.getenv("FOLLICORE_ENABLE_METRICS", "true").lower() == "true",
            metrics_port=int(os.getenv("FOLLICORE_METRICS_PORT", "9090")),
            enable_tracing=os.getenv("FOLLICORE_ENABLE_TRACING", "false").lower() == "true",
            tracing_endpoint=os.getenv("FOLLICORE_TRACING_ENDPOINT"),
            service_name=os.getenv("FOLLICORE_SERVICE_NAME", "follicore-ml-api"),
        )


@dataclass
class Config:
    """Main configuration container."""

    server: ServerConfig
    model: ModelConfig
    logging: LoggingConfig
    security: SecurityConfig
    metrics: MetricsConfig

    @classmethod
    def from_env(cls) -> "Config":
        """Load all configuration from environment variables."""
        return cls(
            server=ServerConfig.from_env(),
            model=ModelConfig.from_env(),
            logging=LoggingConfig.from_env(),
            security=SecurityConfig.from_env(),
            metrics=MetricsConfig.from_env(),
        )

    @classmethod
    def default(cls) -> "Config":
        """Create default configuration (for development)."""
        return cls(
            server=ServerConfig(),
            model=ModelConfig(),
            logging=LoggingConfig(),
            security=SecurityConfig(),
            metrics=MetricsConfig(),
        )


# Global configuration instance
_config: Optional[Config] = None


def get_config() -> Config:
    """Get the global configuration instance."""
    global _config
    if _config is None:
        _config = Config.from_env()
    return _config


def set_config(config: Config) -> None:
    """Set the global configuration instance (for testing)."""
    global _config
    _config = config
