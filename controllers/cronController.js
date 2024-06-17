const cron = require('node-cron');
const elasticsearchService = require('../services/elasticSearchService');
const graph = require('../services/graphService');

module.exports = (msalClient, userId) => {
    // Cron job to fetch email updates every 5 minutes
    cron.schedule('*/5 * * * * *', async () => {
        console.log('Running cron job to fetch email updates for user:', userId);

        try {
            // Fetch lastSyncTime from Elasticsearch for the user
            const userData = await elasticsearchService.getUserByEmail(userId);
            const lastSyncTime = userData ? userData.lastSyncTime : new Date().toISOString();

            // Fetch emails from Microsoft Graph using delta query
            const emails = await graph.fetchEmailsDelta(msalClient, userId, lastSyncTime);

            // Process each email to check if it already exists in Elasticsearch
            for (const email of emails) {
                const emailExists = await elasticsearchService.checkIfEmailMessageExists(email.id);

                if (!emailExists) {
                    // If email does not exist, save it to Elasticsearch
                    const emailDoc = {
                        userId: userId,
                        messageId: email.id,
                        subject: email.subject,
                        body: email.bodyPreview,
                        receivedDate: email.receivedDateTime,
                        senderName: email.from?.emailAddress?.name,
                        senderEmail: email.from?.emailAddress?.address,
                    };

                    await elasticsearchService.saveEmailMessage(emailDoc);
                }
            }

            // Update lastSyncTime for the user in Elasticsearch
            await elasticsearchService.updateLastSyncTime(userId, new Date().toISOString());

            console.log(`Email synchronization completed for user ${userId}`);
        } catch (error) {
            console.error(`Error during email synchronization for user ${userId}:`, error);
        }
    });
};
