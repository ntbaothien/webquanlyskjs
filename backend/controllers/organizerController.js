import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Booking from '../models/Booking.js';
import { paginate } from '../utils/pagination.js';

/**
 * GET /api/organizer/events and /api/organizer/my-events
 * Returns paginated result with content/totalPages matching frontend
 */
export const getMyEvents = async (req, res) => {
  try {
    const { status, page, size } = req.query;
    const filter = { organizerId: req.user._id };
    if (status) filter.status = status;

    const result = await paginate(Event, filter, {
      page, size: size || 20,
      sort: { createdAt: -1 }
    });

    // Add id field for frontend
    result.content = result.content.map(e => ({ ...e, id: e._id }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/organizer/events — create event (multipart)
 */
export const createEvent = async (req, res) => {
  try {
    const { title, description, location, startDate, endDate, maxCapacity, status, tagsInput, isFree, zonesJson } = req.body;

    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];
    const free = isFree === 'true' || isFree === true;

    let seatZones = [];
    if (!free && zonesJson) {
      try {
        seatZones = JSON.parse(zonesJson);
      } catch { /* ignore */ }
    }

    const category = mapTagToCategory(tags[0]);

    const event = await Event.create({
      title,
      description,
      location,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      maxCapacity: parseInt(maxCapacity) || 0,
      status: status || 'DRAFT',
      tags,
      category,
      free,
      seatZones,
      organizerId: req.user._id,
      organizerName: req.user.fullName,
      bannerImagePath: req.file ? `/uploads/${req.file.filename}` : ''
    });

    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/organizer/events/:id
 */
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Không tìm thấy sự kiện' });

    if (event.organizerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa sự kiện này' });
    }

    const { title, description, location, startDate, endDate, maxCapacity, status, tagsInput, isFree, zonesJson } = req.body;

    if (title) event.title = title;
    if (description) event.description = description;
    if (location) event.location = location;
    if (startDate) event.startDate = startDate;
    if (endDate) event.endDate = endDate;
    if (maxCapacity !== undefined) event.maxCapacity = parseInt(maxCapacity) || 0;
    if (status) event.status = status;
    if (tagsInput !== undefined) {
      event.tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      event.category = mapTagToCategory(event.tags[0]);
    }
    if (isFree !== undefined) event.free = isFree === 'true' || isFree === true;

    if (!event.free && zonesJson) {
      try {
        event.seatZones = JSON.parse(zonesJson);
      } catch { /* ignore */ }
    }

    if (req.file) {
      event.bannerImagePath = `/uploads/${req.file.filename}`;
    }

    await event.save();
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/organizer/events/:id
 */
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Không tìm thấy sự kiện' });

    if (event.organizerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Không có quyền xóa sự kiện này' });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Xóa sự kiện thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/organizer/events/:id/registrations
 */
export const getEventRegistrations = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Không tìm thấy sự kiện' });

    if (event.organizerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Không có quyền xem' });
    }

    const [registrations, bookings] = await Promise.all([
      Registration.find({ eventId: req.params.id }).sort({ createdAt: -1 }).lean(),
      Booking.find({ eventId: req.params.id }).sort({ createdAt: -1 }).lean()
    ]);

    const enrichedRegs = registrations.map(r => ({ ...r, id: r._id, registeredAt: r.createdAt }));
    const enrichedBookings = bookings.map(b => ({ ...b, id: b._id, finalAmount: b.totalPrice }));

    res.json({ registrations: enrichedRegs, bookings: enrichedBookings, event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper: map tag to category enum
function mapTagToCategory(tag) {
  if (!tag) return 'OTHER';
  const t = tag.toLowerCase();
  const map = {
    'music': 'MUSIC', 'âm nhạc': 'MUSIC', 'nhạc': 'MUSIC', 'concert': 'MUSIC',
    'sports': 'SPORTS', 'thể thao': 'SPORTS',
    'art': 'ART', 'nghệ thuật': 'ART',
    'workshop': 'WORKSHOP',
    'conference': 'CONFERENCE', 'hội thảo': 'CONFERENCE',
    'food': 'FOOD', 'ẩm thực': 'FOOD',
    'community': 'COMMUNITY', 'cộng đồng': 'COMMUNITY'
  };
  return map[t] || 'OTHER';
}
