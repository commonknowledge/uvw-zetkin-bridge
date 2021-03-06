// @ts-nocheck

'use strict';

import * as crypto from 'crypto'
import * as url from 'url'
import Z from './client'


const defaultOpts = {
    tokenCookieName: 'apiAccessToken',
    sessionCookieName: 'apiSession',
    defaultRedirPath: '/',
    logoutRedirPath: null,
    zetkinDomain: 'zetk.in',
    minAuthLevel: undefined,
    secret: null,
};


export function initialize(opts = {}) {
    opts = Object.assign({}, defaultOpts, opts);

    if (!opts.secret) {
        throw 'Encryption secret must be a 24 character string!';
    }

    return (req, res, next) => {
        req.z = new Z({
            clientId: opts.app.id,
            clientSecret: opts.app.secret,
            zetkinDomain: opts.zetkinDomain,
            ssl: opts.ssl,
        });

        let session = req.cookies?.[opts.sessionCookieName];
        if (req.query.code) {
            const callbackUrl = url.format({
                protocol: process.env.ZETKIN_CLIENT_PROTOCOL ? process.env.ZETKIN_CLIENT_PROTOCOL : opts.ssl ? 'https' : 'http',
                host: req.get('host'),
                pathname: req.path,
                query: req.query,
            });

            req.z.authenticate(callbackUrl)
                .then(() => {
                    setTokenCookies(req, res, opts);

                    // Redirect to same URL without the code
                    let query = Object.assign({}, req.query);
                    delete query.code;

                    res.redirect(url.format({
                        protocol: opts.ssl? 'https' : 'http',
                        host: req.get('host'),
                        pathname: req.path,
                        query: query,
                    }));
                })
                .catch(err => {
                    console.error(err)
                    res.redirect(opts.defaultRedirPath);
                });
        }
        else if (session) {
            try {
                const [ encrypted, ivHex ] = session.split('$');
                const ivBuf = Buffer.from(ivHex, 'hex');
                const decipher = crypto.createDecipheriv('aes192', opts.secret, ivBuf);

                let decrypted = decipher.update(encrypted, 'hex', 'utf8');
                decrypted += decipher.final('utf8');
                req.z.setToken(decrypted);
            }
            catch (err) {
                res.clearCookie(opts.tokenCookieName);
                res.clearCookie(opts.sessionCookieName);
            }
            next();
        }
        else {
            next();
        }
    };
}

export function login(opts = {}) {
    opts = Object.assign({}, defaultOpts, opts);

    return (req, res, next) => {
        const path = req.query.redirPath || opts.defaultRedirPath;

        const redirUrl = encodeURIComponent(url.format({
            protocol: opts.ssl? 'https' : 'http',
            host: req.get('host'),
            pathname: path,
        }));

        res.redirect(req.z.getLoginUrl(redirUrl));
    };
}

export function validate(opts = {}, preventRedirect = false) {
    opts = Object.assign({}, defaultOpts, opts);

    return (req, res, next) => {
        // Try to get session to verify ticket
        req.z.resource('session').get()
            .then(result => {
                req.isZetkinAuthenticated = true;

                // While validating, the token may have been updated, e.g. if
                // the previous token had expired. Store new ticket in cookie.
                setTokenCookies(req, res, opts);

                if (opts.minAuthLevel) {
                    let session = result.data.data;
                    if (session.level < opts.minAuthLevel) {
                        const redirUrl = encodeURIComponent(url.format({
                            protocol: opts.ssl? 'https' : 'http',
                            host: req.get('host'),
                            pathname: req.baseUrl? (req.baseUrl + req.path) : req.path,
                            query: req.query,
                        }));

                        let loginUrl = '//login.' + process.env.ZETKIN_DOMAIN + '/upgrade'
                            + '?access_token=' + req.z.getTokenData().access_token
                            + '&redirect_uri=' + redirUrl;

                        res.redirect(loginUrl);

                        return;
                    }
                }

                next();
            })
            .catch(() => {
                res.clearCookie(opts.tokenCookieName);
                res.clearCookie(opts.sessionCookieName);

                if (preventRedirect) {
                    next();
                }
                else {
                    const redirUrl = encodeURIComponent(url.format({
                        protocol: opts.ssl? 'https' : 'http',
                        host: req.get('host'),
                        pathname: req.baseUrl? (req.baseUrl + req.path) : req.path,
                        query: req.query,
                    }));

                    res.redirect(req.z.getLoginUrl(redirUrl));
                }
            });
    }
}

export function logout(opts = {}) {
    opts = Object.assign({}, defaultOpts, opts);

    return (req, res, next) => {
        res.clearCookie(opts.tokenCookieName);
        res.clearCookie(opts.sessionCookieName);
        req.z.resource('session').del()
            .then(() => {
                res.redirect(opts.logoutRedirPath || opts.defaultRedirPath);
            })
            .catch(() => {
                res.redirect(opts.defaultRedirPath);
            });
    }
}

export function setTokenCookies(req, res, opts = {}) {
    const cookieOpts = {
        secure: opts.ssl,
    };

    const ivBuf = Buffer.alloc(16);
    crypto.randomFillSync(ivBuf);

    const cipher = crypto.createCipheriv('aes192', opts.secret, ivBuf);
    const token = req.z.getToken()
    let encryptedTokenData = cipher.update(token, 'utf8', 'hex');
    encryptedTokenData += cipher.final('hex');
    encryptedTokenData += '$' + ivBuf.toString('hex');

    let tokenData = req.z.getTokenData();
    res.cookie(opts.tokenCookieName, tokenData.access_token, cookieOpts);
    res.cookie(opts.sessionCookieName, encryptedTokenData, cookieOpts);
}