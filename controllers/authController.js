const graph = require('../services/graphService');
const elasticsearchService = require('../services/elasticSearchService');
const scopes = process.env.OAUTH_SCOPES || 'https://graph.microsoft.com/.default';
const cronJob = require('../controllers/cronController');
module.exports = {
    signin: async (req, res) => {
        const urlParameters = {
            scopes: scopes.split(','),
            redirectUri: process.env.OAUTH_REDIRECT_URI,
        };

        try {
            const authUrl = await req.app.locals.msalClient.getAuthCodeUrl(urlParameters);
            res.redirect(authUrl);
        } catch (error) {
            console.log(`Error: ${error}`);
            req.flash('error_msg', {
                message: 'Error getting auth URL',
                debug: JSON.stringify(error, Object.getOwnPropertyNames(error)),
            });
            res.redirect('/');
        }
    },

    redirect: async (req, res) => {
        const tokenRequest = {
            code: req.query.code,
            scopes: scopes.split(','),
            redirectUri: process.env.OAUTH_REDIRECT_URI,
        };

        if (!tokenRequest.code) {
            req.flash('error_msg', {
                message: 'Authorization code is missing in the request.',
            });
            return res.redirect('/');
        }

        try {
            const response = await req.app.locals.msalClient.acquireTokenByCode(tokenRequest);
            req.session.userId = response.account.homeAccountId;

            const user = await graph.getUserDetails(req.app.locals.msalClient, req.session.userId);
            const userRecord = {
                email: user.mail || user.userPrincipalName,
                localId: response.account.homeAccountId,
                accessToken: response.accessToken,
                refreshToken: response.refreshToken,
            };

            let userData = await elasticsearchService.getUserByEmail(userRecord.email);

            if (!userData) {
                userRecord.fetchedEmails = false;
                userRecord.lastSyncTime = new Date().toISOString();
                await elasticsearchService.saveUser(userRecord);
                userData = await elasticsearchService.getUserByEmail(userRecord.email);
                const emails = await graph.fetchEmails(req.app.locals.msalClient, req.session.userId);
                const emailDocs = emails.map(email => ({
                    userId: req.session.userId,
                    messageId: email.id,
                    subject: email.subject,
                    body: email.bodyPreview,
                    receivedDate: email.receivedDateTime,
                    senderName: email.from?.emailAddress?.name,
                    senderEmail: email.from?.emailAddress?.address,
                    isRead: email.isRead
                }));

                await elasticsearchService.bulkSaveEmails(emailDocs);
                await elasticsearchService.updateFetchedEmails(userRecord.email, true);
            }

            cronJob(req.app.locals.msalClient, req.session.userId);

            req.app.locals.users[req.session.userId] = {
                displayName: user.displayName,
                email: user.mail || user.userPrincipalName,
                timeZone: user.mailboxSettings.timeZone,
            };
        } catch (error) {
            console.error(`Error completing authentication: ${error}`);
            if (error?.body) {
                console.error(`Elasticsearch error details: ${JSON.stringify(error?.body?.error)}`);
            }
            req.flash('error_msg', {
                message: 'Error completing authentication',
                debug: JSON.stringify(error, Object.getOwnPropertyNames(error)),
            });
        }

        res.redirect('/');
    },

    signout: async (req, res) => {
        if (req.session.userId) {
            const accounts = await req.app.locals.msalClient.getTokenCache().getAllAccounts();
            const userAccount = accounts.find(a => a.homeAccountId === req.session.userId);
            cronJob.cancelCronJob(req.session.userId);

            if (userAccount) {
                req.app.locals.msalClient.getTokenCache().removeAccount(userAccount);
            }
        }

        req.session.destroy(function () {
            res.redirect('/');
        });
    }
};
