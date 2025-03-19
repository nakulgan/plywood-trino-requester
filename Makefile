.PHONY: up down test integration-test demo

# Start Docker containers
up:
	docker-compose up -d

# Start Docker containers and follow logs
up-logs:
	docker-compose up

# Stop Docker containers
down:
	docker-compose down

# Run unit tests
test:
	npm test

# Run integration tests with Docker environment
integration-test: up
	@echo "Waiting for Trino to start (15s)..."
	@sleep 15
	TRINO_INTEGRATION=true npm test
	make down

# Clean up Docker environment and build artifacts
clean: down
	rm -rf build/
	
# Build the project
build:
	npm run compile

# Run a demo query against Trino
demo: build up
	@echo "Waiting for Trino to start (10s)..."
	@sleep 10
	node docker/demo-query.js