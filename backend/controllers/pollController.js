import Poll from '../models/Poll.js';

export const createPoll = async (req, res) => {
  try {
    const poll = await Poll.create({
      ...req.body,
      options: req.body.options.map(opt => ({ text: opt, votes: [] })),
      creatorId: req.user._id
    });
    res.status(201).json(poll);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getEventPolls = async (req, res) => {
  try {
    const polls = await Poll.find({ eventId: req.params.eventId }).sort({ createdAt: -1 });
    res.json(polls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const votePoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (poll.isClosed) return res.status(400).json({ error: 'Poll is closed' });
    
    // One vote check
    const hasVoted = poll.options.some(opt => opt.votes.includes(req.user._id));
    if (hasVoted) return res.status(400).json({ error: 'Already voted' });

    poll.options[req.body.optionIndex].votes.push(req.user._id);
    await poll.save();
    res.json(poll);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const closePoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    poll.isClosed = true;
    await poll.save();
    res.json(poll);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deletePoll = async (req, res) => {
  try {
    await Poll.findByIdAndDelete(req.params.id);
    res.json({ message: 'Poll deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
