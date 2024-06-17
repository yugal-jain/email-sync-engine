var graph = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');

module.exports = {
  getUserDetails: async function (msalClient, userId) {
    const client = initAuthenticatedGraphClient(msalClient, userId);
    const user = await client
      .api('/me')
      .select('displayName,mail,mailboxSettings,userPrincipalName')
      .get();
    return user;
  },
  fetchEmails: async function (msalClient, userId) {
    try {
      const client = initAuthenticatedGraphClient(msalClient, userId);
      console.log('Fetching emails for user ID:', userId);

      let messages = [];
      let response;
      let retryCount = 0;
      const maxRetries = 5;

      do {
        try {
          response = await client
            .api('/me/mailFolders/inbox/messages')
            .select('subject,from,receivedDateTime,isRead,bodyPreview')
            .orderby('receivedDateTime DESC')
            .top(50)
            .get();

          messages = messages.concat(response.value);
          while (response['@odata.nextLink']) {
            response = await client
              .api(response['@odata.nextLink'])
              .get();
            messages = messages.concat(response.value);
          }

          break;
        } catch (error) {

          if (error.statusCode === 429) {
            retryCount++;

            const retryAfter = error.headers['Retry-After'] || Math.min(2 ** retryCount, 60);
            console.warn(`Rate limit hit, retrying after ${retryAfter} seconds... (Attempt ${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          } else {
            throw error; // Non-retryable error
          }
        }
      } while (retryCount < maxRetries);

      if (retryCount >= maxRetries) {
        console.error('Max retries reached. Failed to fetch emails.');
        throw new Error('Failed to fetch emails due to rate limiting.');
      }

      if (messages.length === 0) {
        console.log('No emails found in the inbox.');
        return [];
      }

      console.log('Fetched emails:', messages.length);
      return messages;
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw new Error('Access is denied. Check credentials and try again.');
    }
  },
  fetchEmailsWithoutRateLimiting: async function (msalClient, userId) {
    try {
      const client = initAuthenticatedGraphClient(msalClient, userId);
      console.log('Fetching emails for user ID:', userId);

      let messages = [];
      let response = await client
        .api('/me/mailFolders/inbox/messages')
        .select('subject,from,receivedDateTime,isRead,bodyPreview')
        .orderby('receivedDateTime DESC')
        .top(50)  // Fetch the top 50 emails per request
        .get();

      messages = messages.concat(response.value);

      // Handle pagination
      while (response['@odata.nextLink']) {
        response = await client
          .api(response['@odata.nextLink'])
          .get();

        messages = messages.concat(response.value);
      }

      if (messages.length === 0) {
        console.log('No emails found in the inbox.');
        return [];
      }

      console.log('Fetched emails:', messages.length);
      return messages;
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw new Error('Access is denied. Check credentials and try again.');
    }
  },
  fetchEmailsDelta: async function (msalClient, userId, lastSyncTime) {
    const client = initAuthenticatedGraphClient(msalClient, userId);
    let deltaLink = '/me/mailFolders/inbox/messages/delta?$top=50';

    if (lastSyncTime) {
      deltaLink += `&$filter=receivedDateTime ge ${lastSyncTime}`;
    }

    const emails = [];
    let response = await client
      .api(deltaLink)
      .select('subject,from,receivedDateTime,isRead,bodyPreview')
      .orderby('receivedDateTime DESC')
      .get();

    emails.push(...response.value);

    while (response['@odata.deltaLink']) {
      deltaLink = response['@odata.deltaLink'];
      response = await client
        .api(deltaLink)
        .select('subject,from,receivedDateTime,isRead,bodyPreview')
        .orderby('receivedDateTime DESC')
        .get();
      emails.push(...response.value);
    }

    return emails;
  },
  initAuthenticatedGraphClient
};

function initAuthenticatedGraphClient(msalClient, userId) {
  if (!msalClient || !userId) {
    throw new Error(
      `Invalid MSAL state. Client: ${msalClient ? 'present' : 'missing'}, User ID: ${userId ? 'present' : 'missing'}`);
  }

  const client = graph.Client.init({
    authProvider: async (done) => {
      try {
        const account = await msalClient
          .getTokenCache()
          .getAccountByHomeId(userId);

        if (account) {
          const scopes = process.env.OAUTH_SCOPES || 'https://graph.microsoft.com/.default';
          const response = await msalClient.acquireTokenSilent({
            scopes: scopes.split(','),
            redirectUri: process.env.OAUTH_REDIRECT_URI,
            account: account
          });

          done(null, response.accessToken);
        } else {
          throw new Error('No account found for the given userId.');
        }
      } catch (err) {
        console.error('Error acquiring token silently:', err);
        done(err, null);
      }
    }
  });

  return client;
}