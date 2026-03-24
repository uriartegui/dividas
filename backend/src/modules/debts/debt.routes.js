const router = require('express').Router()
const auth = require('../../middlewares/auth.middleware')
const controller = require('./debt.controller')

router.use(auth)

router.get('/', controller.list)
router.get('/:id', controller.getOne)
router.post('/', controller.create)
router.put('/:id', controller.update)
router.patch('/:id/status', controller.updateStatus)

module.exports = router
