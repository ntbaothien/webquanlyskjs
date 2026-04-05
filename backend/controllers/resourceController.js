import Resource from '../models/Resource.js';

export const getResources = async (req, res) => {
  try {
    const resources = await Resource.find({ eventId: req.params.eventId });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createResource = async (req, res) => {
  try {
    const resource = await Resource.create(req.body);
    res.status(201).json(resource);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateResource = async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(resource);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteResource = async (req, res) => {
  try {
    await Resource.findByIdAndDelete(req.params.id);
    res.json({ message: 'Resource deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
