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

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch all CONFIRMED or PENDING bookings for this venue on the specified date
    const bookings = await Booking.find({
      venue: params.id,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['PENDING', 'CONFIRMED', 'PAYMENT_PENDING'] },
    })
    .populate('user', 'name')
    .select('startTime endTime status playersCount teamSide classification user offlineCustomerName')
    .lean();

    // Group by slot
    const slotStats = {};

    function formatToAMPM(timeStr) {
      let [h, m] = timeStr.split(':').map(Number);
      const meridiem = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${meridiem}`;
    }

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
