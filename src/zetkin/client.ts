import { merge, uniqueId } from 'lodash';
var url = require('url');
var http = require('http');
var https = require('https');
var ClientOAuth2 = require('client-oauth2')
import btoa from 'btoa'
import atob from 'atob'

const defaultConfig = {
  clientId: null,
  clientSecret: null,
  redirectUri: null,
  zetkinDomain: 'zetk.in',
  accessTokenUri: '{PROTOCOL}://api.{ZETKIN_DOMAIN}/v{VERSION}/oauth/token/',
  authorizationUri: '{PROTOCOL}://api.{ZETKIN_DOMAIN}/v{VERSION}/oauth/authorize/',
  scopes: [],
  base: '',
  version: 1,
  ssl: true,
  host: 'api.{ZETKIN_DOMAIN}',
  port: undefined,
}

/**
 * Zetkin API utility. Use the exported Z singleton, or create separate
 * instances using Z.construct().
*/
export default class Zetkin {
    private id = uniqueId()
    private _token = null;
    private _offsetSec = 0;
    private _client = null;
    private _config

    constructor (private instanceOptions: Partial<typeof defaultConfig>) {
      this._config = merge(defaultConfig, this.instanceOptions)
      this.configure();
    }

    configure () {
        if (this._config.clientId) {
            this._client = new ClientOAuth2({
                clientId: this._config.clientId,
                clientSecret: this._config.clientSecret,
                accessTokenUri: this._config.accessTokenUri
                    .replace('{PROTOCOL}', this._config.ssl? 'https' : 'http')
                    .replace('{VERSION}', String(this._config.version))
                    .replace('{ZETKIN_DOMAIN}', this._config.zetkinDomain),
                authorizationUri: this._config.authorizationUri
                    .replace('{PROTOCOL}', this._config.ssl? 'https' : 'http')
                    .replace('{VERSION}', String(this._config.version))
                    .replace('{ZETKIN_DOMAIN}', this._config.zetkinDomain),
                redirectUri: this._config.redirectUri,
                scopes: [],
            });
        }
    }

    getConfig () {
        return this._config;
    }

    _validateClientConfiguration() {
        if (this._client) {
            return true;
        }
        else {
            throw new Error('SDK client not configured');
        }
    }

    setToken (token) {
        this._validateClientConfiguration();

        try {
            var data = JSON.parse(atob(token));
        }
        catch (err) {
            throw new Error('Malformed token');
        }

        this._token = this._client.createToken(data);
    }

    getToken () {
        this._validateClientConfiguration();
        if (this._token) {
            return btoa(JSON.stringify(this._token.data));
        }

        return null;
    }

    setAccessToken (accessToken) {
        this._validateClientConfiguration();
        this._token = this._client.createToken(accessToken, null, 'bearer');
    }

    setTokenData (data) {
        this._validateClientConfiguration();
        this._token = this._client.createToken(data);
    }

    getTokenData () {
        this._validateClientConfiguration();
        if (this._token) {
            return this._token.data;
        }

        return null;
    }

    getLoginUrl (redirectUri) {
        this._validateClientConfiguration();

        var opts = {
            redirectUri: redirectUri,
        };

        return this._config.clientSecret?
            this._client.code.getUri(opts) : this._client.token.getUri(opts);
    }

    authenticate (uri) {
        if (!uri) {
            throw new Error('Missing authentication redirect URL');
        }

        this._validateClientConfiguration();

        // Remove code from URL (what's left should be redirect URL)
        var uriObj = url.parse(uri, true);
        delete uriObj.query.code;
        delete uriObj.search;

        var opts = {
            redirectUri: url.format(uriObj),
        };

        var promise = this._config.clientSecret?
            this._client.code.getToken(uri, opts) : this._client.token.getToken(uri, opts);

        return promise
            .then(token => this._token = token);
    }

    /**
     * Retrieve a resource proxy through which requests to that resource can be
     * made.
     *
     * Example: Z.resource('orgs', 1, 'people').get() will make a HTTP GET
     * request to the /orgs/1/people resource.
    */
    resource () {
        let path = Array.prototype.join.call(arguments, '/');
        if (path.length == 0 || path[0] != '/') {
            path = '/' + path;
        }

        path = this._config.base + '/v' + this._config.version + path;

        return new ZetkinResourceProxy(this, path, this._request.bind(this));
    };

    /**
     * Make request via HTTP or HTTPS depending on the configuration.
    */
    _request (options, data, meta, ticket) {
        options.withCredentials = false;
        options.hostname = this._config.host.replace('{ZETKIN_DOMAIN}', this._config.zetkinDomain);
        options.port = this._config.port || (this._config.ssl? 443 : 80);
        options.ssl = this._config.ssl;
        options.headers = options.headers || {};

        if (data) {
            options.headers['content-type'] = 'application/json';
        }

        if (this._token) {
            this._token.sign(options);
        }

        return requestPromise(options, data, meta)
            .catch(err => {
                if (err && err.httpStatus == 401) {
                    let originalError = err;
                    if (err.data && err.data.error == 'Key has expired, please renew') {
                        return this._token
                            .refresh()
                            .then(token => {
                                this._token = token;

                                // Re-sign and retry
                                this._token.sign(options);
                                return requestPromise(options, data, meta);
                            })
                            .catch(err => {
                                // Try again without authorization altogether
                                delete options.headers.Authorization;
                                return requestPromise(options, data, meta);
                            })
                            .catch(err => {
                                throw originalError;
                            });
                    }
                    else {
                        // Try again without authorization
                        delete options.headers.Authorization;
                        return requestPromise(options, data, meta)
                            .catch(err => {
                                throw originalError;
                            });
                    }
                }

                throw err;
            });
    };
}


class ZetkinResourceProxy {
    _meta = {};

    constructor(private z: Zetkin, private path, private _request) {
    }

    getPath () {
        return this.path;
    };

    meta (keyOrObj, valueIfAny) {
        if (keyOrObj == null) {
            throw new Error(
                'Invalid meta() signature: Pass key and value or object');
        }
        else if (arguments.length == 1 && typeof keyOrObj == 'object') {
            var key;
            for (key in keyOrObj) {
                this._meta[key] = keyOrObj[key];
            }
        }
        else if (arguments.length == 2) {
            this._meta[keyOrObj] = valueIfAny;
        }
        else {
            throw new Error(
                'Invalid meta() signature: Pass key and value or object');
        }

        return this;
    };

    get (page, perPage, filters) {
        var opts = {
            method: 'GET',
            path: this.path,
        };

        var query = [];

        if (page !== undefined && page !== null) {
            query.push('p=' + page || 0);

            if (perPage) {
                query.push('pp=' + perPage);
            }
        }

        if (filters) {
            if (filters.length >= 0) {
                for (var i = 0; i < filters.length; i++) {
                    if (filters[i].length !== 3) {
                        throw new Error(
                            'get() filters should be array of triplets');
                    }

                    var filter = filters[i].join('');
                    query.push('filter=' + encodeURIComponent(filter));
                }
            }
            else {
                throw new Error('get() filters should be array of triplets');
            }
        }

        if (query.length) {
            opts.path += '?' + query.join('&');
        }

        return this._request(opts, null, this._meta);
    };

    post (data) {
        var opts = {
            method: 'POST',
            path: this.path
        };

        return this._request(opts, data, this._meta);
    };

    patch (data) {
        var opts = {
            method: 'PATCH',
            path: this.path
        };

        return this._request(opts, data, this._meta);
    };

    del () {
        var opts = {
            method: 'DELETE',
            path: this.path
        };

        return this._request(opts, null, this._meta);
    };

    put (data) {
        var opts = {
            method: 'PUT',
            path: this.path
        };

        return this._request(opts, data, this._meta);
    };
};

function requestPromise(options, data, meta) {
    var client = options.ssl? https : http;

    return new Promise(function(resolve, reject) {
        let req = client.request(options, function(res) {
            var json = '';

            if (res.setEncoding) {
                // The setEncoding() method may not exist, e.g. if running in
                // the browser using the Browserify abstraction layer.
                res.setEncoding('utf-8');
            }

            res.on('data', function(chunk) {
                json += chunk;
            });

            res.on('end', function() {
                var data

                try {
                  data = json ? JSON.parse(json) : null;
                } catch (e) {
                  console.error("Error reading data from request", { json }, e)
                  data = null
                } 

                var success = (res.statusCode >= 200 && res.statusCode < 400);
                if (success) {
                    resolve({
                        data,
                        meta,
                        httpStatus: res.statusCode
                    });
                }
                else {
                    reject({
                        data,
                        meta,
                        httpStatus: res.statusCode
                    });
                }
            });
        });

        req.on('error', function(e) {
            reject(e);
        });

        if (data) {
            var json = JSON.stringify(data)
            req.write(json);
        }

        req.end();
    });
}