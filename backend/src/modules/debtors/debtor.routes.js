const router = require('express').Router()
const auth = require('../../middlewares/auth.middleware')
const controller = require('./debtor.controller')

router.use(auth)

router.get('/', controller.list)
router.get('/:id', controller.getOne)
router.post('/', controller.create)
router.put('/:id', controller.update)
router.delete('/:id', controller.remove)

module.exports = router
