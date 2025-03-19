/*
 * Copyright 2015-2016 Imply Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { expect } = require("chai");
const toArray = require("stream-to-array");
const { Readable } = require("stream");

const { trinoRequesterFactory } = require('../build/trinoRequester');

const info = require('./info');

const trinoRequester = trinoRequesterFactory({
  host: info.trinoHost,
  catalog: info.trinoCatalog,
  schema: info.trinoSchema,
  auth: {
    user: info.trinoUser,
    password: info.trinoPassword
  }
});

describe("Trino requester", function() {
  this.timeout(5 * 1000);

  describe("error", function() {
    it("throws if there is not host or locator", function() {
      expect(() => {
        trinoRequesterFactory({});
      }).to.throw('must have a `host` or a `locator`');
    });

    it("correct error for bad table", function() {
      // Only run this test if TRINO_INTEGRATION environment variable is set
      const isIntegration = process.env.TRINO_INTEGRATION === 'true';
      if (!isIntegration) {
        this.skip(); // Skip unless using the Docker integration environment
        return;
      }
      
      let stream = trinoRequester({
        query: "SELECT * FROM not_a_real_datasource"
      });

      return toArray(stream)
        .then(() => {
          throw new Error('DID_NOT_ERROR');
        })
        .catch((err) => {
          expect(err.message).to.contain("not_a_real_datasource");
        });
    });
  });

  describe("basic working", function() {
    it("creates a query stream - test implementation", function() {
      // Only run this test if TRINO_INTEGRATION environment variable is set
      const isIntegration = process.env.TRINO_INTEGRATION === 'true';
      if (!isIntegration) {
        this.skip(); // Skip unless using the Docker integration environment
        return;
      }
      
      let stream = trinoRequester({
        query: "SELECT 1 as value"
      });
      
      expect(stream).to.be.instanceof(Readable);
      
      return toArray(stream)
        .then((results) => {
          expect(results).to.have.length(1);
          expect(results[0]).to.have.property('value', 1);
        });
    });

    it("runs a metadata query on TPC-H orders table", function() {
      // Only run this test if TRINO_INTEGRATION environment variable is set
      const isIntegration = process.env.TRINO_INTEGRATION === 'true';
      if (!isIntegration) {
        this.skip(); // Skip unless using the Docker integration environment
        return;
      }
      
      let stream = trinoRequester({
        query: "SHOW COLUMNS FROM orders"
      });

      return toArray(stream)
        .then((res) => {
          // Check that we have the expected columns in the orders table
          const columnNames = res.map(r => r.column_name);
          expect(columnNames).to.include.members([
            "orderkey", 
            "custkey", 
            "orderstatus", 
            "totalprice", 
            "orderdate", 
            "orderpriority", 
            "clerk", 
            "shippriority"
          ]);
        });
    });
    
    it("runs a query against TPC-H dataset", function() {
      // Only run this test if TRINO_INTEGRATION environment variable is set
      const isIntegration = process.env.TRINO_INTEGRATION === 'true';
      if (!isIntegration) {
        this.skip(); // Skip unless using the Docker integration environment
        return;
      }
      
      let stream = trinoRequester({
        query: "SELECT count(*) as order_count FROM orders"
      });

      return toArray(stream)
        .then((res) => {
          expect(res).to.have.length(1);
          expect(res[0]).to.have.property('order_count');
          expect(res[0].order_count).to.be.a('number');
          expect(res[0].order_count).to.be.greaterThan(0);
        });
    });

  });

});
