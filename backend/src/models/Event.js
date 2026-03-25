const mongoose = require('mongoose');
const { Schema } = mongoose;

const eventSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Tên sự kiện là bắt buộc'],
      trim: true,
      maxlength: [200, 'Tên sự kiện không quá 200 ký tự'],
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Danh mục là bắt buộc'],
      enum: [
        'Music',
        'Sports',
        'Conference',
        'Exhibition',
        'Festival',
        'Workshop',
        'Comedy',
        'Theater',
        'Food',
        'Other',
      ],
    },
    location: {
      type: String,
      trim: true,
    },
    // GeoJSON Point để dùng $near geospatial query
    geoLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    latitude: { type: Number },
    longitude: { type: Number },
    startTime: {
      type: Date,
      required: [true, 'Thời gian bắt đầu là bắt buộc'],
    },
    endTime: {
      type: Date,
      required: [true, 'Thời gian kết thúc là bắt buộc'],
    },
    saleStart: { type: Date },
    saleEnd: { type: Date },
    images: [{ type: String }],
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Cancelled', 'Ended'],
      default: 'Draft',
    },
    languages: [{ type: String }],
    googleCalendarId: { type: String },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial index — dùng cho tìm kiếm sự kiện gần đây
eventSchema.index({ geoLocation: '2dsphere' });
// Full-text search index
eventSchema.index({ title: 'text', description: 'text', location: 'text' });
// Compound index cho filter
eventSchema.index({ status: 1, startTime: 1, category: 1 });
eventSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Event', eventSchema);
