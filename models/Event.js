const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    address: { type: String, required: true, trim: true },
    description: {
      type: String,
      required: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    image: { type: String, default: "defaultevent.png" },
    seatsTotal: {
      type: Number,
      required: true,
      min: [1, "Total seats must be at least 1"],
    },
    seatsFilled: {
      type: Number,
      default: 0,
      min: [0, "Filled seats cannot be negative"],
      validate: {
        validator: function (v) {
          return v <= this.seatsTotal;
        },
        message: "Filled seats cannot exceed total seats",
      },
    },
    hostId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bookings: [{ type: Schema.Types.ObjectId, ref: "Booking" }],
  },
  { timestamps: true }
);

eventSchema.index({ title: 1, date: 1 }, { unique: true });
eventSchema.index({ hostId: 1 });
eventSchema.index({ date: 1 });

eventSchema.pre("save", function (next) {
  if (this.seatsFilled > this.seatsTotal) {
    return next(new Error("Filled seats cannot exceed total seats"));
  }
  next();
});

module.exports = mongoose.model("Event", eventSchema);
