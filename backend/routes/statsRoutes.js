const express = require('express');
const router = express.Router();
const { getStatsOverview } = require('../controllers/statsController');

router.get('/overview', getStatsOverview);

module.exports = router;