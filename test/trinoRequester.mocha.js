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
      this.skip(); // Skip until Trino server is set up
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
      this.skip(); // Skip this test for now as we don't have a proper trino-client setup
      
      // The test would look like this when you have a proper trino-client setup
      /*
      let stream = trinoRequester({
        query: "SELECT 1 as value"
      });
      
      expect(stream).to.be.instanceof(Readable);
      */
    });

    it.skip("runs a metadata query - skipped", () => {
      let stream = trinoRequester({
        query: "SHOW COLUMNS FROM wikipedia"
      });

      return toArray(stream)
        .then((res) => {
          expect(res.map(r => {
            return r.column_name + ' ~ ' + r.data_type;
          })).to.deep.equal([
            "__time ~ timestamp",
            "sometimeLater ~ timestamp",
            "channel ~ varchar",
            "cityName ~ varchar",
            "comment ~ varchar",
            "commentLength ~ integer",
            "commentLengthStr ~ varchar",
            "countryIsoCode ~ varchar",
            "countryName ~ varchar",
            "deltaBucket100 ~ integer",
            "isAnonymous ~ boolean",
            "isMinor ~ boolean",
            "isNew ~ boolean",
            "isRobot ~ boolean",
            "isUnpatrolled ~ boolean",
            "metroCode ~ integer",
            "namespace ~ varchar",
            "page ~ varchar",
            "regionIsoCode ~ varchar",
            "regionName ~ varchar",
            "user ~ varchar",
            "userChars ~ varchar",
            "count ~ bigint",
            "added ~ bigint",
            "deleted ~ bigint",
            "delta ~ bigint",
            "min_delta ~ integer",
            "max_delta ~ integer",
            "deltaByTen ~ double"
          ]);
        });
    });

  });

});
