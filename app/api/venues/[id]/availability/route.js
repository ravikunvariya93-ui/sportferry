import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { getISTDayRange, cleanupExpiredPayments, formatToAMPM } from '@/lib/booking-utils';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ message: 'Date parameter is required.' }, { status: 400 });
    }

    await dbConnect();
    
    // Cleanup expired payments before checking availability
    await cleanupExpiredPayments();

    // Use robust IST timezone range
    const { startUTC, endUTC } = getISTDayRange(date);

    // Fetch all CONFIRMED or PENDING bookings for this venue on the specified date
    let bookings = await Booking.find({
      venue: params.id,
      date: { $gte: startUTC, $lte: endUTC },
      status: { $in: ['PENDING', 'CONFIRMED', 'PAYMENT_PENDING'] },
    })
    .populate('user', 'name')
    .select('startTime endTime status playersCount teamSide classification user offlineCustomerName date')
    .lean();
    
    console.log(`[Availability API] Found ${bookings.length} bookings for venue ${params.id} on ${date}`);

    // Post-filter: Remove PENDING bookings if the slot has already passed
    const now = new Date();
    bookings = bookings.filter(b => {
      if (b.status === 'CONFIRMED') return true;
      if (b.status === 'PENDING') {
        const [h, m] = b.startTime.split(':').map(Number);
        const slotDate = new Date(b.date);
        slotDate.setHours(h, m, 0, 0);
        return slotDate > now; // Only keep if it's in the future
      }
      return true; // Keep PAYMENT_PENDING (it will be cleaned up by cleanupExpiredPayments)
    });

    // Group by slot
    const slotStats = {};

    bookings.forEach(b => {
      const startAMPM = formatToAMPM(b.startTime);
      const endAMPM = formatToAMPM(b.endTime);
      const slotKey = `${startAMPM} – ${endAMPM}`;
      if (!slotStats[slotKey]) {
        slotStats[slotKey] = { 
          team1: 0, team2: 0, total: 0, 
          hasSolo: false, soloSide: null,
          team1Slots: [], team2Slots: [] 
        };
      }
      
      const rosterItem = {
        userId: b.user?._id,
        name: b.user?.name || b.offlineCustomerName || 'Manual Block',
        count: b.playersCount,
        type: b.classification
      };

      if (b.teamSide === 2) {
        slotStats[slotKey].team2 += b.playersCount;
        slotStats[slotKey].team2Slots.push(rosterItem);
      } else {
        slotStats[slotKey].team1 += b.playersCount;
        slotStats[slotKey].team1Slots.push(rosterItem);
      }
      
      slotStats[slotKey].total += b.playersCount;
      
      if (b.classification === 'SOLO') {
        slotStats[slotKey].hasSolo = true;
        slotStats[slotKey].soloSide = b.teamSide;
      }
    });

    return NextResponse.json({ slotStats });
  } catch (error) {
    console.error('[GET /api/venues/[id]/availability]', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
