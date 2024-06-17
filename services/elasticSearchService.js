const client = require('../config/elasticsearchConfig');

const saveUser = async (user) => {
    const createdUser = await client.index({
        index: 'users',
        body: user
    });

    return createdUser;
};

const getAllUsers = async () => {
    try {
        const results = await client.search({
            index: 'users',
            body: {
                query: {
                    match_all: {}
                }
            }
        });

        return results.hits.hits.map(hit => ({
            id: hit._id,
            ...hit._source
        }));
    } catch (error) {
        console.error('Error while fetching all users:', error);
        throw error;
    }
};

const getUserByEmail = async (email) => {
    const userSearchResults = await client.search({
        index: 'users',
        body: {
            query: {
                match: { email }
            }
        }
    });

    if (userSearchResults.hits.total.value > 0) {
        return userSearchResults.hits.hits[0]._source;
    }
    return null;
};

const updateLastSyncTime = async function (email, lastSyncTime) {
    await client.updateByQuery({
        index: 'users',
        body: {
            script: {
                source: 'ctx._source.lastSyncTime = params.lastSyncTime',
                params: {
                    lastSyncTime: lastSyncTime
                }
            },
            query: {
                match: { email: email }
            }
        }
    });
};

const updateFetchedEmails = async function (email, fetchedEmails) {
    await client.updateByQuery({
        index: 'users',
        body: {
            script: {
                source: 'ctx._source.fetchedEmails = params.fetchedEmails',
                params: {
                    fetchedEmails: fetchedEmails
                }
            },
            query: {
                match: { email: email }
            }
        }
    });
};

const saveEmailMessage = async (message) => {
    await client.index({
        index: 'email_messages',
        body: message
    });
};

const deleteEmailById = async (messageId) => {
    await client.deleteByQuery({
        index: 'email_messages',
        body: {
            query: {
                match: { messageId }
            }
        }
    });
};

const checkIfEmailMessageExists = async (messageId) => {
    try {
        const result = await client.search({
            index: 'email_messages',
            body: {
                query: {
                    match: { messageId }
                }
            }
        });

        return result.hits.total.value > 0;
    } catch (error) {
        console.error(`Error checking if email message ${messageId} exists:`, error);
        throw error;
    }
};


const bulkSaveEmails = async function (emails) {
    const body = emails.flatMap(doc => [{ index: { _index: 'email_messages' } }, doc]);

    const savedEmailResponse = await client.bulk({ refresh: true, body });

    if (savedEmailResponse.errors) {
        const erroredDocuments = [];
        savedEmailResponse.items.forEach((action, i) => {
            const operation = Object.keys(action)[0];
            if (action[operation].error) {
                erroredDocuments.push({
                    status: action[operation].status,
                    error: action[operation].error,
                    operation: body[i * 2],
                    document: body[i * 2 + 1]
                });
            }
        });
        console.error('Bulk save errors:', erroredDocuments);
        throw new Error('Error saving emails to Elasticsearch');
    }
};

async function getEmailMessageById(messageId) {
    try {
        const result = await client.search({
            index: 'email_messages',
            body: {
                query: {
                    match: {
                        messageId: messageId
                    }
                }
            }
        });

        const totalHits = result.hits.total?.value;

        if (totalHits > 0) {
            return result.hits.hits.map(hit => hit._source);
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching email message:', error);
        throw error;
    }
}


async function getAllEmailMessages() {
    try {
        const result = await client.search({
            index: 'email_messages',
            body: {
                query: {
                    match_all: {}
                },
                sort: [
                    { receivedDate: { order: 'desc' } }
                ]
            }
        });

        const totalHits = result.hits.total?.value;

        if (totalHits > 0) {
            return result.hits.hits.map(hit => hit._source);
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error fetching all email messages:', error);
        throw error;
    }
}

module.exports = {
    saveUser,
    getAllUsers,
    saveEmailMessage,
    getUserByEmail,
    bulkSaveEmails,
    updateLastSyncTime,
    updateFetchedEmails,
    getEmailMessageById,
    deleteEmailById,
    getAllEmailMessages,
    checkIfEmailMessageExists
};
