FROM node:18-bullseye

WORKDIR /app

# Install dependencies
RUN apt-get update && \
    apt-get install -y git curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set Node to use the legacy OpenSSL provider
ENV NODE_OPTIONS=--openssl-legacy-provider

# Copy the modified Turnilo source (with Trino support)
COPY turnilo/ /app/

# Install dependencies and build
RUN npm install && npm run build

# Copy config
COPY config.yaml /app/config.yaml

EXPOSE 9090

ENTRYPOINT ["./bin/turnilo"]
CMD ["run-config", "/app/config.yaml", "--verbose"]
