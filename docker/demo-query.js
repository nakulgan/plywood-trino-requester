/**
 * Demo script to test the plywood-trino-requester with the Docker environment
 */
const { trinoRequesterFactory } = require('../build/trinoRequester');
const toArray = require('stream-to-array');

// Create a Trino requester configured to connect to the Docker container
const trinoRequester = trinoRequesterFactory({
  host: 'localhost:8080',
  catalog: 'tpch',
  schema: 'sf1',
  auth: {
    user: 'trino',
    password: 'datazoo'
  }
});

// Example query - get top 10 orders by price
const query = `
  SELECT 
    orderkey, 
    custkey, 
    orderstatus, 
    totalprice, 
    orderdate
  FROM 
    orders 
  ORDER BY 
    totalprice DESC 
  LIMIT 10
`;

console.log(`Executing query: ${query}`);

// Execute the query and convert the streaming results to an array
const stream = trinoRequester({ query });

toArray(stream)
  .then(results => {
    console.log('\nResults:');
    console.table(results);
    console.log(`\nFound ${results.length} results`);
  })
  .catch(err => {
    console.error('Query error:', err);
  });