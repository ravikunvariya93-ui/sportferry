import Booking from '@/models/Booking';

export function claimBooking(filter, update, options = {}) {
  return Booking.findOneAndUpdate(filter, { $set: update }, { new: true, ...options });
}

export function claimCancelled(id) {
  return claimBooking({ _id: id, status: { $ne: 'CANCELLED' } }, { status: 'CANCELLED' });
}
