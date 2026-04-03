import Poll from '../models/Poll.js';

// @desc    Create a new poll
// @route   POST /api/polls
// @access  Private (Organizer/Admin)
export const createPoll = async (req, res) => {
  const { eventId, question, options } = req.body;
  
  if (!options || options.length < 2) {
    return res.status(400).json({ error: 'Cần ít nhất 2 lựa chọn' });
  }

  try {
    const formattedOptions = options.map(opt => ({ text: opt, votes: [] }));
    const poll = await Poll.create({
      eventId,
      question,
      options: formattedOptions,
      creatorId: req.user._id
    });
    res.status(201).json(poll);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi tạo bình chọn' });
  }
};

// @desc    Get all polls for an event
// @route   GET /api/polls/event/:eventId
// @access  Public
export const getEventPolls = async (req, res) => {
  try {
    const polls = await Poll.find({ eventId: req.params.eventId })
      .sort({ createdAt: -1 });
    res.json(polls);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi lấy danh sách bình chọn' });
  }
};

// @desc    Vote in a poll
// @route   PUT /api/polls/:id/vote
// @access  Private
export const vote = async (req, res) => {
  const { optionIndex } = req.body;
  const userId = req.user._id;

  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ error: 'Không tìm thấy bình chọn' });
    if (poll.isClosed) return res.status(400).json({ error: 'Bình chọn này đã đóng' });

    // Check if user already voted in ANY option of this poll
    const hasVoted = poll.options.some(opt => opt.votes.includes(userId));
    if (hasVoted) return res.status(400).json({ error: 'Bạn đã bình chọn rồi' });

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ error: 'Lựa chọn không hợp lệ' });
    }

    poll.options[optionIndex].votes.push(userId);
    await poll.save();
    
    res.json(poll);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi thực hiện bình chọn' });
  }
};

// @desc    Close a poll
// @route   PUT /api/polls/:id/close
// @access  Private (Creator/Admin)
export const closePoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ error: 'Không tìm thấy bình chọn' });
    
    if (poll.creatorId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Không có quyền đóng bình chọn này' });
    }

    poll.isClosed = true;
    await poll.save();
    res.json(poll);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
};

// @desc    Delete a poll
// @route   DELETE /api/polls/:id
// @access  Private (Creator/Admin)
export const deletePoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ error: 'Không tìm thấy bình chọn' });
    
    if (poll.creatorId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Không có quyền xóa bình chọn này' });
    }

    await Poll.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa bình chọn' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
};
