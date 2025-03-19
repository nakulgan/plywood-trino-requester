# plywood-trino-requester

This is the [Trino](https://trino.io/) requester making abstraction layer for [plywood](https://github.com/implydata/plywood) and [Turnilo](https://github.com/allegro/turnilo) (an OSS UI for Druid).

Given a Trino query and an optional context it returns a readable stream of results.

## Installation

To install run:

```
npm install plywood-trino-requester
```

## Usage

In the raw you could use this library like so:

```javascript
const { trinoRequesterFactory } = require('plywood-trino-requester');
const toArray = require('stream-to-array'); // To get all results as an array

const trinoRequester = trinoRequesterFactory({
  host: 'my.trino.host:8080',
  catalog: 'tpch',
  schema: 'sf1',
  auth: {
    user: 'trino',
    password: 'trino'
  }
});

// Use the requester
const stream = trinoRequester({
  query: 'SELECT "nation", sum("price") AS "TotalPrice" FROM "orders" GROUP BY "nation";'
});

// Stream to array to get all results
toArray(stream)
  .then(results => {
    console.log("Results:", results);
  })
  .catch(err => {
    console.error("Query error:", err);
  });
```

Although usually you would just pass `trinoRequester` into the Trino driver that is part of Plywood or configure it for Turnilo.

## Configuration for Turnilo

To configure this connector with Turnilo, install this package and then update your Turnilo cluster configuration:

```yaml
dataCubes:
  - name: trino_example
    clusterName: trino_cluster
    source: trino

clusters:
  - name: trino_cluster
    type: trino
    host: trino-server:8080
    catalog: tpch
    schema: sf1 
    user: trino
    password: trino-password  # Consider using environment variables for credentials
```

## Tests

To run the unit tests:

```
npm test
```

### Integration Testing with Docker

This project includes a Docker Compose setup for integration testing with real Trino and Turnilo instances.

To start the integration testing environment:

```bash
make up
```

This will start:
- Trino server with TPC-H dataset on port 8080
- Turnilo visualization UI on port 9090

To run tests with the Docker environment active:

```bash
make integration-test
```

This command will:
1. Start Docker containers 
2. Wait for services to initialize
3. Run the test suite
4. Shutdown containers when done

For more details on the Docker setup, see [docker/README.md](docker/README.md).

## Future ToDos:
- [x] Add a Docker container with Trino and test data for full integration testing
- [ ] Add more comprehensive tests for the Trino connection
- [ ] Improve error handling and retry logic
