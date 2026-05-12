import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ message: 'Date parameter is required.' }, { status: 400 });
    }

    await dbConnect();

    // Fetch all CONFIRMED or PENDING bookings for this venue on the specified date
    const bookings = await Booking.find({
      venue: params.id,
      date: new Date(date),
      status: { $in: ['PENDING', 'CONFIRMED', 'PAYMENT_PENDING'] },
    })
    .populate('user', 'name')
    .select('startTime endTime status playersCount teamSide classification user offlineCustomerName')
    .lean();

    // Group by slot
    const slotStats = {};

    bookings.forEach(b => {
      const slotKey = `${b.startTime} – ${b.endTime}`;
      if (!slotStats[slotKey]) {
        slotStats[slotKey] = { 
          team1: 0, team2: 0, total: 0, 
          hasSolo: false, soloSide: null,
          team1Slots: [], team2Slots: [] 
        };
      }
      
      const rosterItem = {
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
