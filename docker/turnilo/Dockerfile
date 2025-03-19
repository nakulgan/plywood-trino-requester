FROM node:18

WORKDIR /app

# Install dependencies
RUN apt-get update && \
    apt-get install -y git curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set Node to use the legacy OpenSSL provider
ENV NODE_OPTIONS=--openssl-legacy-provider

# Clone Turnilo repository
RUN git clone https://github.com/allegro/turnilo.git . && \
    npm install && \
    npm run build

# Copy config
COPY config.yaml /app/config.yaml

# Wait script
RUN echo '#!/bin/bash\n\
echo "Testing connection to Trino..."\n\
curl -v http://trino:8080/v1/info\n\
echo "Starting Turnilo..."\n\
./bin/turnilo run-config /app/config.yaml\n\
' > /app/start.sh && chmod +x /app/start.sh

EXPOSE 9090

# Use the correct command to run Turnilo with config
CMD ["/app/start.sh"]