const helper = require('../services/helper');

const getAll = async (req, res) => {
  try {
    const data = await helper.getAllExhibitions();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const create = async (req, res) => {
  try {
    const id = await helper.createExhibition(req.body);
    res.status(201).json({ success: true, exhibition_id: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getAll, create };
