const router = require('express').Router()
const auth = require('../../middlewares/auth.middleware')
const controller = require('./debtor.controller')
const { upload, importCSV } = require('./debtor.import')

router.use(auth)

router.get('/', controller.list)
router.get('/:id', controller.getOne)
router.post('/', controller.create)
router.put('/:id', controller.update)
router.delete('/:id', controller.remove)

// Import CSV
router.post('/import', upload.single('file'), importCSV)

module.exports = router
