const attendanceService = require('../services/attendance.service');
const { handleDbError } = require('../utils/db-fallback');

function defaultDate() {
  return new Date().toISOString().split('T')[0];
}

const getByDate = async (req, res, next) => {
  try {
    const attendanceDate = req.query.date || defaultDate();
    let result;
    try {
      result = await attendanceService.getByDate(attendanceDate);
    } catch (dbErr) {
      result = handleDbError(dbErr, { date: attendanceDate, data: [] });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const mark = async (req, res, next) => {
  try {
    const payload = {
      attendance_date: req.body.attendance_date,
      user_id: req.body.user_id,
      status: req.body.status,
      notes: req.body.notes,
      marked_by: req.user?.id
    };
    const result = await attendanceService.mark(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const attendanceDate = req.query.date || defaultDate();
    let result;
    try {
      result = await attendanceService.getSummary(attendanceDate);
    } catch (dbErr) {
      result = handleDbError(dbErr, {
        date: attendanceDate,
        total_marked: 0,
        total_active: 0,
        total_deactive: 0
      });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { getByDate, mark, getSummary };
