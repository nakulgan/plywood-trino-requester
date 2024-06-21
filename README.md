# plywood-trino-requester

This is the [Trino](http://www.trino.io/) requester making abstraction layer for [plywood](https://github.com/implydata/plywood).

Given a Trino query and an optional context it return a Q promise that resolves to the data table.

## Installation

To install run:

```
npm install plywood-trino-requester
```

## Usage

In the raw you could use this library like so:

```
trinoRequesterGenerator = require('plywood-trino-requester').trinoRequester

trinoRequester = trinoRequesterGenerator({
  host: 'my.trino.host',
  database: 'all_my_data',
  user: 'HeMan',
  password: 'By_the_Power_of_Greyskull'
})

trinoRequester({
  query: 'SELECT "cut" AS "Cut", sum("price") AS "TotalPrice" FROM "diamonds" GROUP BY "cut";'
})
  .then(function(res) {
    console.log("The first row is:", res[0])
  })
  .done()
```

Although usually you would just pass `trinoRequester` into the Trino driver that is part of Plywood.

## Tests

ToDo:
- [ ] Trino Dockerfile with test DB
- [ ] 
