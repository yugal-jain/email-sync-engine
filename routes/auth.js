const router = require('express-promise-router').default();
const authController = require('../controllers/authController');

router.get('/signin', authController.signin);
router.get('/redirect', authController.redirect);
router.get('/signout', authController.signout);

module.exports = router;
