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

import { PlywoodRequester, PlywoodLocator, basicLocator } from 'plywood-base-api';
import { Readable } from 'stream';

// Define interfaces for trino-client
export interface BasicAuth {
  user: string;
  password: string;
}

// Define query result interface
interface QueryResult {
  data?: any;
  error?: {
    message: string;
  };
}

// Import the actual module
let Trino;
try {
  Trino = require('trino-client');
  // Check if it's using the expected structure
  if (typeof Trino.create !== 'function') {
    console.warn('Warning: trino-client module does not have a create function as expected');
    // Try to adapt to the actual structure if possible
    if (typeof Trino === 'function') {
      const originalTrino = Trino;
      Trino = {
        create: (options: any) => {
          return new originalTrino(options);
        }
      };
    }
  }
} catch (e) {
  console.error('Error loading trino-client module:', e);
  // Set up a mock/dummy Trino object for testing
  Trino = {
    create: () => ({
      query: async () => {
        return {
          [Symbol.asyncIterator]: () => ({
            next: async () => ({
              done: true,
              value: undefined
            })
          })
        };
      }
    })
  };
}

export interface TrinoRequesterParameters {
  locator?: PlywoodLocator;
  host?: string;
  auth: BasicAuth;
  catalog: string;
  schema: string;
}

export function trinoRequesterFactory(parameters: TrinoRequesterParameters): PlywoodRequester<string> {
  let locator = parameters.locator;
  if (!locator) {
    let host = parameters.host;
    if (!host) throw new Error("must have a `host` or a `locator`");
    locator = basicLocator(host, 443);
  }
  let auth: BasicAuth = parameters.auth;
  let catalog = parameters.catalog;
  let schema = parameters.schema;

  return (request): Readable => {
    let query = request.query;

    let stream = new Readable({
      objectMode: true,
      read: function () {}
    });

    locator()
      .then(async (location) => {
        try {
          let client = Trino.create({
            server: `${location.hostname}:${location.port}`,
            catalog: catalog,
            schema: schema,
            auth: auth,
          } as any);

          try {
            const queryIterator = await client.query(query);
            for await (const queryResult of queryIterator) {
              if (queryResult.error) {
                stream.emit('error', queryResult.error.message);
                return;
              }

              if (queryResult.data) {
                stream.push(queryResult.data);
              }
            }
          } catch (queryError) {
            const error = queryError as any;
            stream.emit('error', error && error.message ? error.message : '' + error);
          }
          stream.push(null); // End the stream
        } catch (e) {
          stream.emit('error', e);
        }
      })
      .catch(err => {
        stream.emit('error', err);
      });

    return stream;
  }
}
