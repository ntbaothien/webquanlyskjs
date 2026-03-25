const mongoose = require('mongoose');
const { Schema } = mongoose;

const ticketTypeSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Tên loại vé là bắt buộc'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Giá vé là bắt buộc'],
      min: [0, 'Giá vé không âm'],
    },
    quantity: {
      type: Number,
      required: [true, 'Số lượng vé là bắt buộc'],
      min: [1, 'Số lượng vé phải ít nhất 1'],
    },
    sold: {
      type: Number,
      default: 0,
      min: 0,
    },
    isGroupTicket: {
      type: Boolean,
      default: false,
    },
    groupSize: {
      type: Number,
      default: 1,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

ticketTypeSchema.index({ eventId: 1 });

// Virtual: số vé còn lại
ticketTypeSchema.virtual('remaining').get(function () {
  return this.quantity - this.sold;
});

module.exports = mongoose.model('TicketType', ticketTypeSchema);
