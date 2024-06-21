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

const { trinoRequesterFactory } = require('../build/trinoRequester');

const info = require('./info');

const trinoRequester = trinoRequesterFactory({
  host: info.trinoHost,
  catalog: info.trinoCatalog,
  schema: info.trinoSchema,
  user: info.trinoUser,
  password: info.trinUser
  // TODO: Auth/JWT support
});

describe("Trino requester", function() {
  this.timeout(5 * 1000);

  describe("error", function() {
    it("throws if there is not host or locator", function() {
      expect(() => {
        trinoRequesterFactory({});
      }).to.throw('must have a `host` or a `locator`');
    });

    it("correct error for bad table", () => {
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
    it("runs a metadata query", () => {
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

    it("runs a SELECT / GROUP BY", () => {
      let stream = trinoRequester({
        query: `SELECT "channel" AS "Channel", sum("added") AS "TotalAdded", sum("deleted") AS "TotalDeleted" FROM "wikipedia" WHERE "cityName" = 'Tokyo' GROUP BY "channel" ORDER BY "channel"`
      });

      return toArray(stream)
        .then((res) => {
          expect(res).to.deep.equal([
            {
              "Channel": "de",
              "TotalAdded": 0,
              "TotalDeleted": 109
            },
            {
              "Channel": "en",
              "TotalAdded": 3500,
              "TotalDeleted": 447
            },
            {
              "Channel": "fr",
              "TotalAdded": 0,
              "TotalDeleted": 0
            },
            {
              "Channel": "ja",
              "TotalAdded": 75168,
              "TotalDeleted": 2462
            },
            {
              "Channel": "ko",
              "TotalAdded": 0,
              "TotalDeleted": 57
            },
            {
              "Channel": "ru",
              "TotalAdded": 898,
              "TotalDeleted": 194
            },
            {
              "Channel": "zh",
              "TotalAdded": 72,
              "TotalDeleted": 21
            }
          ]);
        });
    });

    it("works correctly with time", () => {
      let stream = trinoRequester({
        query: `SELECT MAX("__time") AS "MaxTime" FROM "wikipedia"`
      });

      return toArray(stream)
        .then((res) => {
          expect(res).to.deep.equal([
            {
              "MaxTime": new Date('2015-09-12T23:59:00.000Z')
            }
          ]);
        });
    });

    it("works correctly with count", () => {
      let stream = trinoRequester({
        query: `SELECT COUNT(*) AS "__VALUE__" FROM "wikipedia" WHERE ("cityName" IS NOT DISTINCT FROM 'El Paso')`
      });

      return toArray(stream)
        .then((res) => {
          expect(res).to.deep.equal([
            {
              "__VALUE__": 2
            }
          ]);
        });
    });

  });

});
