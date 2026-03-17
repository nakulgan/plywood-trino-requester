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
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

export interface BasicAuth {
  user: string;
  password: string;
}

export interface TrinoRequesterParameters {
  locator?: PlywoodLocator;
  host?: string;
  auth?: BasicAuth;
  catalog: string;
  schema: string;
  timeout?: number;
}

export function trinoRequesterFactory(parameters: TrinoRequesterParameters): PlywoodRequester<string> {
  let locator = parameters.locator;
  if (!locator) {
    let host = parameters.host;
    if (!host) throw new Error("must have a `host` or a `locator`");

    let hostname: string;
    let port: number = 8080;

    if (host.includes(':')) {
      const parts = host.split(':');
      hostname = parts[0];
      port = parseInt(parts[1], 10);
    } else {
      hostname = host;
    }

    locator = basicLocator(hostname, port);
  }

  const auth: BasicAuth = parameters.auth || { user: 'trino', password: '' };
  const catalog = parameters.catalog;
  const schema = parameters.schema;
  const timeout = parameters.timeout || 60000;

  return (request): Readable => {
    const query = request.query;

    const stream = new Readable({
      objectMode: true,
      read: function () {}
    });

    locator()
      .then((location) => {
        const isSecure = location.port === 443;
        const doRequest = isSecure
          ? (opts: http.RequestOptions, cb: (res: http.IncomingMessage) => void) => https.request(opts, cb)
          : (opts: http.RequestOptions, cb: (res: http.IncomingMessage) => void) => http.request(opts, cb);

        const headers: Record<string, string> = {
          'X-Trino-Catalog': catalog,
          'X-Trino-Schema': schema,
          'X-Trino-User': auth.user,
          'Content-Type': 'text/plain'
        };

        if (auth.password) {
          headers['Authorization'] = 'Basic ' + Buffer.from(`${auth.user}:${auth.password}`).toString('base64');
        }

        const options: http.RequestOptions = {
          hostname: location.hostname,
          port: location.port,
          path: '/v1/statement',
          method: 'POST',
          headers: headers,
          timeout: timeout
        };

        // Column names from the first response — Trino only sends columns
        // in the first page, subsequent pages only have data arrays.
        let columnNames: string[] = null;

        const handleResponse = (response: http.IncomingMessage) => {
          let responseData = '';

          response.on('data', (chunk) => {
            responseData += chunk;
          });

          response.on('end', () => {
            if (response.statusCode && (response.statusCode < 200 || response.statusCode >= 300)) {
              stream.emit('error', new Error(`HTTP Error ${response.statusCode}: ${responseData}`));
              return;
            }

            try {
              const result = JSON.parse(responseData);

              if (result.error) {
                stream.emit('error', new Error(result.error.message || 'Unknown Trino error'));
                return;
              }

              // Capture column metadata from the first response that includes it
              if (result.columns && !columnNames) {
                columnNames = result.columns.map((col: any) => col.name);
              }

              if (result.data && result.data.length > 0 && columnNames) {
                for (const row of result.data) {
                  const obj: Record<string, any> = {};
                  for (let i = 0; i < columnNames.length; i++) {
                    obj[columnNames[i]] = row[i];
                  }
                  stream.push(obj);
                }
              }

              if (result.nextUri) {
                const nextUriUrl = new URL(result.nextUri);

                const nextHeaders: Record<string, string> = {
                  'X-Trino-User': auth.user
                };

                if (auth.password) {
                  nextHeaders['Authorization'] = headers['Authorization'];
                }

                const nextOptions: http.RequestOptions = {
                  hostname: nextUriUrl.hostname,
                  port: nextUriUrl.port || (isSecure ? 443 : 80),
                  path: nextUriUrl.pathname + nextUriUrl.search,
                  method: 'GET',
                  headers: nextHeaders,
                  timeout: timeout
                };

                const nextReq = doRequest(nextOptions, handleResponse);
                nextReq.on('error', (err) => {
                  stream.emit('error', err);
                });
                nextReq.end();
              } else {
                stream.push(null);
              }
            } catch (e) {
              stream.emit('error', e);
            }
          });
        };

        const req = doRequest(options, handleResponse);
        req.on('error', (err) => {
          stream.emit('error', err);
        });
        req.write(query);
        req.end();
      })
      .catch(err => {
        stream.emit('error', err);
      });

    return stream;
  };
}
