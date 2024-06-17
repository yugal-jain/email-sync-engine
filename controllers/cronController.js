const cron = require('node-cron');
const elasticsearchService = require('../services/elasticSearchService');
const graph = require('../services/graphService');
const cronJobs = {};

module.exports = (msalClient, userId) => {
    // Cancel existing cron job if it exists
    if (cronJobs[userId]) {
        cronJobs[userId].stop();
        delete cronJobs[userId]; // Remove from dictionary
    }

    // Cron job to fetch email updates every 5 seconds
    cronJobs[userId] = cron.schedule('*/5 * * * * *', async () => {
        console.log('Running cron job to fetch email updates for user:', userId);

        try {
            // Fetch lastSyncTime from Elasticsearch for the user
            const userData = await elasticsearchService.getUserByEmail(userId);
            const lastSyncTime = userData ? userData.lastSyncTime : new Date().toISOString();

            // Fetch emails from Microsoft Graph using delta query
            const emails = await graph.fetchEmailsDelta(msalClient, userId, lastSyncTime);

            // Process each email to check if it already exists in Elasticsearch
            for (const email of emails) {
                // Check if the email exists in Elasticsearch
                const emailExists = await elasticsearchService.checkIfEmailMessageExists(email.id);

                if (emailExists) {
                    // If email exists, update it in Elasticsearch
                    const updatedEmailDoc = {
                        userId: userId,
                        messageId: email.id,
                        subject: email.subject,
                        body: email.bodyPreview,
                        receivedDate: email.receivedDateTime,
                        senderName: email.from?.emailAddress?.name,
                        senderEmail: email.from?.emailAddress?.address,
                        isRead: email.isRead
                    };

                    await elasticsearchService.updateFetchedEmails(email.id, updatedEmailDoc);
                } else {
                    // If email does not exist, save it to Elasticsearch
                    const newEmailDoc = {
                        userId: userId,
                        messageId: email.id,
                        subject: email.subject,
                        body: email.bodyPreview,
                        receivedDate: email.receivedDateTime,
                        senderName: email.from?.emailAddress?.name,
                        senderEmail: email.from?.emailAddress?.address,
                        isRead: email.isRead
                    };

                    await elasticsearchService.saveEmailMessage(newEmailDoc);
                }
            }
            await handleDeletedEmails(userId, emails);
            // Update lastSyncTime for the user in Elasticsearch
            await elasticsearchService.updateLastSyncTime(userId, new Date().toISOString());

            console.log(`Email synchronization completed for user ${userId}`);
        } catch (error) {
            console.error(`Error during email synchronization for user ${userId}:`, error);
        }
    }, {
        scheduled: false // Start cron job manually after initialization
    });

    // Start the cron job immediately after initialization
    cronJobs[userId].start();
};

async function handleDeletedEmails(userId, fetchedEmails) {
    try {
        // Fetch all email messages currently stored in Elasticsearch for the user
        const storedEmails = await elasticsearchService.getAllEmailMessages();

        // Identify emails that are present in Elasticsearch but not in the fetchedEmails
        const emailsToDelete = storedEmails.filter(storedEmail => !fetchedEmails.find(fetchedEmail => fetchedEmail.id === storedEmail.messageId));

        // Delete identified emails from Elasticsearch
        for (const emailToDelete of emailsToDelete) {
            await elasticsearchService.deleteEmailById(emailToDelete.messageId);
            console.log(`Deleted email message ${emailToDelete.messageId} for user ${userId}`);
        }
    } catch (error) {
        console.error(`Error handling deleted emails for user ${userId}:`, error);
        throw error;
    }
}

module.exports.cancelCronJob = (userId) => {
    if (cronJobs[userId]) {
        cronJobs[userId].stop();
        delete cronJobs[userId]; // Optionally remove from dictionary
        console.log(`Cancelled cron job for user ${userId}`);
    } else {
        console.warn(`No cron job found for user ${userId}`);
    }
};
