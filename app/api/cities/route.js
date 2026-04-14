import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Venue from '@/models/Venue';

export async function GET() {
  try {
    await dbConnect();
    const cities = await Venue.distinct('city');
    return NextResponse.json({ cities: cities.filter(Boolean).sort() });
  } catch {
    return NextResponse.json({ cities: [] });
  }
}
