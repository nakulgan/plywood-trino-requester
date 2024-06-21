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
import { Connector, Trino } from 'trino-client'; // Using Trino client

export interface TrinoRequesterParameters {
  locator?: PlywoodLocator;
  host?: string;
  user: string;
  catalog: string;
  schema: string;
}

export function trinoRequesterFactory(parameters: TrinoRequesterParameters): PlywoodRequester<string> {
  let locator = parameters.locator;
  if (!locator) {
    let host = parameters.host;
    if (!host) throw new Error("must have a `host` or a `locator`");
    locator = basicLocator(host, 8080); // Default Trino port
  }
  let user = parameters.user;
  let catalog = parameters.catalog;
  let schema = parameters.schema;

  return (request): Readable => {
    let query = request.query;

    let stream = new Readable({
      objectMode: true,
      read: function () {}
    });

    locator()
      .then((location) => {
        const connector = new Connector({
          host: location.hostname,
          port: location.port || 8080,
          user: user,
          catalog: catalog,
          schema: schema,
        });

        const trino = new Trino(connector);

        trino.execute({
          query: query,
          streamResults: true,
        })
          .then(response => {
            response.stream.on('data', (row: any) => {
              stream.push(row);
            });

            response.stream.on('end', () => {
              stream.push(null);
            });

            response.stream.on('error', (err: Error) => {
              stream.emit('error', err);
            });
          })
          .catch((err: Error) => {
            stream.emit('error', err);
          });
      })
      .catch((err: Error) => {
        stream.emit('error', err);
      });

    return stream;
  };
}
