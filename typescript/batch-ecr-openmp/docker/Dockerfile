# Multi-stage build for OpenMP C++ application
FROM ubuntu:24.04 as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    g++ \
    make \
    libomp-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /build

# Copy source code
COPY src/openmp/ .

# Build the application
RUN make clean && make

# Runtime stage
FROM ubuntu:24.04

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -u 1001 openmp

# Copy the built executable
COPY --from=builder /build/openmp_benchmark /usr/local/bin/

# Set executable permissions
RUN chmod +x /usr/local/bin/openmp_benchmark

# Switch to non-root user
USER openmp

# Set working directory
WORKDIR /home/openmp

# Default command
ENTRYPOINT ["/usr/local/bin/openmp_benchmark"]
CMD ["--json"]

# Labels for metadata
LABEL maintainer="OpenMP Showcase"
LABEL description="C++20 OpenMP parallel computing benchmark for AWS Batch"
LABEL version="1.0"
