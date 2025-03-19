# Docker Integration Testing Environment

This directory contains the Docker Compose setup for integration testing of the plywood-trino-requester.

## Components

1. **Trino Server**: A Trino SQL query engine pre-configured with TPC-H dataset for testing
2. **Turnilo**: An OSS UI for data visualization, configured to use our Trino connector

## Usage

From the project root directory, run:

```bash
docker-compose up
```

This will start both Trino and Turnilo. Once running, you can access:

- Trino UI: http://localhost:8080
  - Username: trino
  - Password: datazoo
  
- Turnilo UI: http://localhost:9090

## TPC-H Dataset

The Trino instance comes with the TPC-H connector, which provides synthetic data for testing:

- `tpch.sf1.orders`: Information about orders
- `tpch.sf1.customer`: Customer information
- `tpch.sf1.lineitem`: Line items in orders
- `tpch.sf1.part`: Part information
- `tpch.sf1.supplier`: Supplier information
- `tpch.sf1.nation`: Nation information
- `tpch.sf1.region`: Region information

## Running Integration Tests

With the Docker environment running, you can execute the integration tests:

```bash
npm test
```

Make sure to update the `test/info.js` with the correct connection details if needed.

## Manual Testing

You can also manually test the connector by:

1. Querying Trino directly through its UI
2. Exploring data through Turnilo

## Demo Script

A demo script is included to show how to use the plywood-trino-requester with the Docker environment:

```bash
make demo
```

This will:
1. Build the project
2. Start the Docker environment if not already running
3. Run a sample query that shows the top 10 orders by price from the TPC-H dataset