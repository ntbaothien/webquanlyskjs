import Resource from '../models/Resource.js';
import Event from '../models/Event.js';

// @desc    Get all resources for an event
// @route   GET /api/resources/event/:eventId
// @access  Private/Organizer
export const getResourcesByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Check if event exists and user is the organizer
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Sự kiện không tồn tại' });
    }

    // Authorization check: Only organizer or admin
    if (event.organizerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập tài nguyên của sự kiện này' });
    }

    const resources = await Resource.find({ eventId }).sort({ createdAt: -1 });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi lấy danh sách tài nguyên' });
  }
};

// @desc    Add a resource to an event
// @route   POST /api/resources
// @access  Private/Organizer
export const addResource = async (req, res) => {
  try {
    const { name, quantity, status, eventId, notes } = req.body;

    if (!name || !eventId) {
      return res.status(400).json({ error: 'Thiếu thông tin tên tài nguyên hoặc ID sự kiện' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Sự kiện không tồn tại' });
    }

    if (event.organizerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Bạn không có quyền thêm tài nguyên cho sự kiện này' });
    }

    const resource = await Resource.create({
      name,
      quantity: quantity || 1,
      status: status || 'PENDING',
      eventId,
      notes: notes || ''
    });

    res.status(201).json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi thêm tài nguyên' });
  }
};

// @desc    Update a resource
// @route   PUT /api/resources/:id
// @access  Private/Organizer
export const updateResource = async (req, res) => {
  try {
    const { name, quantity, status, notes } = req.body;
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ error: 'Tài nguyên không tồn tại' });
    }

    const event = await Event.findById(resource.eventId);
    if (event.organizerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa tài nguyên này' });
    }

    resource.name = name || resource.name;
    resource.quantity = quantity !== undefined ? quantity : resource.quantity;
    resource.status = status || resource.status;
    resource.notes = notes !== undefined ? notes : resource.notes;

    const updatedResource = await resource.save();
    res.json(updatedResource);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi cập nhật tài nguyên' });
  }
};

// @desc    Delete a resource
// @route   DELETE /api/resources/:id
// @access  Private/Organizer
export const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ error: 'Tài nguyên không tồn tại' });
    }

    const event = await Event.findById(resource.eventId);
    if (event.organizerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Bạn không có quyền xóa tài nguyên này' });
    }

    await resource.deleteOne();
    res.json({ message: 'Đã xóa tài nguyên thành công' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi xóa tài nguyên' });
  }
};
