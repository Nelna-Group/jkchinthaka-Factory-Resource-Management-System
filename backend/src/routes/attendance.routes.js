const router = require('express').Router();
const ctrl = require('../controllers/attendance.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate, attendanceMarkSchema } = require('../middlewares/validate.middleware');
const { auditLog } = require('../middlewares/audit.middleware');

router.use(authenticate);

router.get('/', authorize('Admin', 'Manager', 'Data Entry'), ctrl.getByDate);
router.get('/summary', authorize('Admin', 'Manager', 'Data Entry'), ctrl.getSummary);
router.post('/mark', authorize('Admin', 'Manager', 'Data Entry'), validate(attendanceMarkSchema), auditLog('upsert', 'user_attendance'), ctrl.mark);

module.exports = router;
