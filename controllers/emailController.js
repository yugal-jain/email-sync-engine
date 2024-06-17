const elasticsearchService = require('../services/elasticSearchService');

module.exports = {
    getEmailById: async (req, res) => {
        try {
            if (!req.session.userId) {
                return res.redirect('/');
            }
            const emailMessage = await elasticsearchService.getEmailMessageById(req.params.messageId);
            return res.status(200).json(emailMessage);
        } catch (err) {
            console.error(`Error while fetching email message by messageId: ${err}`);
            req.flash('error_msg', {
                message: 'Could not fetch email',
                debug: JSON.stringify(err, Object.getOwnPropertyNames(err)),
            });
            return res.redirect('/');
        }
    },

    getAllEmails: async (req, res) => {
        try {
            if (!req.session.userId) {
                return res.redirect('/');
            }
            const emailMessages = await elasticsearchService.getAllEmailMessages();
            const params = { emailMessages };
            return res.render('emailMessages', params);
        } catch (err) {
            console.error(`Error while fetching email messages: ${err}`);
            req.flash('error_msg', {
                message: 'Could not fetch emails',
                debug: JSON.stringify(err, Object.getOwnPropertyNames(err)),
            });
            return res.redirect('/');
        }
    },
};
