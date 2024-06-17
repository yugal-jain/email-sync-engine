const router = require('express-promise-router').default();
const emailController = require('../controllers/emailController');

router.get('/', emailController.getAllEmails);
router.get('/:messageId', emailController.getEmailById);

module.exports = router;
