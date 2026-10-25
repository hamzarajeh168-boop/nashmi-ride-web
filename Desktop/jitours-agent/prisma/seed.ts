import { Prisma, PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const json = (value: unknown) => value as Prisma.InputJsonValue;

const tours = [
  {
    title: "5-Day Jordan Classic", slug: "5-day-jordan-classic", destination: "Jordan", cities: ["Amman", "Madaba", "Petra", "Wadi Rum", "Dead Sea"], category: "Classic", durationDays: 5, durationNights: 4, hotelClass: "4 star",
    shortDescription: "A remarkable first journey through Jordan's ancient wonders and desert landscapes.", description: "Discover Jordan from the lively capital to the rose-red city of Petra, with memorable moments at the Dead Sea and beneath the stars in Wadi Rum.",
    coverImage: "https://images.unsplash.com/photo-1579606032821-4e6161c81bd3?auto=format&fit=crop&w=1500&q=85", gallery: ["https://images.unsplash.com/photo-1579606032821-4e6161c81bd3?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?auto=format&fit=crop&w=1200&q=80"],
    itinerary: [{ day: 1, title: "Welcome to Amman", description: "Meet your driver and settle into the capital.", overnight: "Amman", meals: ["D"] }, { day: 2, title: "Madaba & Mount Nebo", description: "Explore Madaba's mosaics and the view from Mount Nebo.", overnight: "Petra", meals: ["B"] }, { day: 3, title: "Petra", description: "Spend a full day discovering the Nabataean city.", overnight: "Petra", meals: ["B"] }, { day: 4, title: "Wadi Rum", description: "Travel to Wadi Rum for desert scenery and a Bedouin camp.", overnight: "Wadi Rum", meals: ["B", "D"] }, { day: 5, title: "Dead Sea & departure", description: "Enjoy the Dead Sea before returning to Amman.", overnight: "—", meals: ["B"] }],
    prices: [{ groupSize: "1", adult: 899, child: 699, infant: 0 }, { groupSize: "2", adult: 699, child: 555, infant: 0 }, { groupSize: "3", adult: 629, child: 499, infant: 0 }, { groupSize: "4", adult: 589, child: 469, infant: 0 }, { groupSize: "5", adult: 569, child: 449, infant: 0 }, { groupSize: "6+", adult: 555, child: 435, infant: 0 }],
    included: ["Private air-conditioned transport", "English-speaking driver", "Accommodation with breakfast", "Wadi Rum jeep tour"], excluded: ["International flights", "Travel insurance", "Personal expenses"],
    startPoint: "Queen Alia International Airport or Amman hotel", endPoint: "Amman or Queen Alia International Airport", availableDates: "Daily, subject to hotel availability", minGroupSize: 1, maxGroupSize: 12, difficulty: "Moderate", whatToBring: "Comfortable walking shoes, sun protection, refillable water bottle.", practicalNotes: "Petra involves several hours of walking on uneven paths.", agentNotes: "A great introduction to Jordan. Mention group-size pricing and the Dead Sea stop. Never promise hotel names until confirmed.", currency: "USD", seasonalNote: "Rates may vary during holidays and peak dates.", singleSupplement: 190, priceOnRequest: false,
  },
  {
    title: "7-Day Jordan Highlights", slug: "7-day-jordan-highlights", destination: "Jordan", cities: ["Amman", "Jerash", "Madaba", "Kerak", "Petra", "Wadi Rum", "Dead Sea"], category: "Classic", durationDays: 7, durationNights: 6, hotelClass: "4 star",
    shortDescription: "A deeper Jordan journey with Jerash, Kerak Castle, Petra and the desert.", description: "See Jordan's celebrated archaeological sites at a comfortable pace, from Jerash's Roman colonnades and Kerak Castle to Petra, Wadi Rum and the Dead Sea.",
    coverImage: "https://images.unsplash.com/photo-1548786811-dd6e453ccca7?auto=format&fit=crop&w=1500&q=85", gallery: ["https://images.unsplash.com/photo-1548786811-dd6e453ccca7?auto=format&fit=crop&w=1200&q=80"],
    itinerary: [{ day: 1, title: "Arrival in Amman", description: "Airport welcome and hotel check-in.", overnight: "Amman", meals: ["D"] }, { day: 2, title: "Jerash & Amman", description: "Visit Jerash and explore Amman's highlights.", overnight: "Amman", meals: ["B"] }, { day: 3, title: "Madaba & Kerak", description: "See the Madaba mosaics and Kerak Castle.", overnight: "Petra", meals: ["B"] }, { day: 4, title: "Petra", description: "A full day at Petra.", overnight: "Petra", meals: ["B"] }, { day: 5, title: "Wadi Rum", description: "Discover the desert on a jeep excursion.", overnight: "Wadi Rum", meals: ["B", "D"] }, { day: 6, title: "Dead Sea", description: "Relax at the Dead Sea.", overnight: "Dead Sea", meals: ["B"] }, { day: 7, title: "Departure", description: "Transfer to Amman airport.", overnight: "—", meals: ["B"] }],
    prices: [{ groupSize: "1", adult: 1150, child: 920, infant: 0 }, { groupSize: "2", adult: 899, child: 740, infant: 0 }, { groupSize: "3", adult: 810, child: 680, infant: 0 }, { groupSize: "4", adult: 770, child: 640, infant: 0 }, { groupSize: "5", adult: 735, child: 610, infant: 0 }, { groupSize: "6+", adult: 710, child: 590, infant: 0 }],
    included: ["Private transport", "Six nights' accommodation", "Daily breakfast", "Wadi Rum jeep tour"], excluded: ["International flights", "Travel insurance", "Meals not listed"],
    startPoint: "Amman airport", endPoint: "Amman airport", availableDates: "Daily", minGroupSize: 1, maxGroupSize: 12, difficulty: "Moderate", whatToBring: "Walking shoes and sun protection.", practicalNotes: "Driving times vary with traffic and road conditions.", agentNotes: "Emphasize Jerash and Kerak for history lovers.", currency: "USD", seasonalNote: "", singleSupplement: 260, priceOnRequest: false,
  },
  {
    title: "Small Group Jordan in 5 Days", slug: "small-group-jordan-5-days", destination: "Jordan", cities: ["Amman", "Petra", "Wadi Rum", "Dead Sea"], category: "Small Group", durationDays: 5, durationNights: 4, hotelClass: "3 star",
    shortDescription: "Share Jordan's highlights with a small group of no more than 15 travellers.", description: "A friendly small-group escape covering Petra, Wadi Rum and the Dead Sea with time to connect with fellow travellers.",
    coverImage: "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?auto=format&fit=crop&w=1500&q=85", gallery: ["https://images.unsplash.com/photo-1512632578888-169bbbc64f33?auto=format&fit=crop&w=1200&q=80"],
    itinerary: [{ day: 1, title: "Amman arrival", description: "Arrival and group welcome.", overnight: "Amman", meals: ["D"] }, { day: 2, title: "Petra", description: "Explore Petra with the group.", overnight: "Petra", meals: ["B"] }, { day: 3, title: "Petra to Wadi Rum", description: "Travel south for a desert experience.", overnight: "Wadi Rum", meals: ["B", "D"] }, { day: 4, title: "Dead Sea", description: "Enjoy the Dead Sea.", overnight: "Dead Sea", meals: ["B"] }, { day: 5, title: "Departure", description: "Transfer to the airport.", overnight: "—", meals: ["B"] }],
    prices: [{ groupSize: "1", adult: 750, child: 620, infant: 0 }, { groupSize: "2", adult: 650, child: 560, infant: 0 }, { groupSize: "3", adult: 620, child: 530, infant: 0 }, { groupSize: "4", adult: 610, child: 520, infant: 0 }, { groupSize: "5", adult: 600, child: 510, infant: 0 }, { groupSize: "6+", adult: 590, child: 500, infant: 0 }],
    included: ["Shared group transport", "Accommodation with breakfast", "Selected group activities"], excluded: ["Flights", "Personal expenses"],
    startPoint: "Amman", endPoint: "Amman", availableDates: "Selected group departures; ask us for current dates", minGroupSize: 2, maxGroupSize: 15, difficulty: "Moderate", whatToBring: "Walking shoes, hat and sunscreen.", practicalNotes: "Maximum group size is 15 travellers.", agentNotes: "State the maximum size clearly; don't promise a departure date unless provided.", currency: "USD", seasonalNote: "", singleSupplement: 150, priceOnRequest: false,
  },
  {
    title: "8-Day Women-Only Jordan Journey", slug: "8-day-women-only-jordan", destination: "Jordan", cities: ["Amman", "Jerash", "Petra", "Wadi Rum", "Dead Sea"], category: "Women Only", durationDays: 8, durationNights: 7, hotelClass: "4 star",
    shortDescription: "A thoughtfully paced women-only journey through Jordan's most loved places.", description: "Connect with Jordan's culture and landscapes on a women-only itinerary featuring Petra, Wadi Rum and time by the Dead Sea.",
    coverImage: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1500&q=85", gallery: ["https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80"],
    itinerary: [{ day: 1, title: "Welcome to Amman", description: "Arrival and welcome.", overnight: "Amman", meals: ["D"] }, { day: 2, title: "Jerash", description: "Explore the ancient city of Jerash.", overnight: "Amman", meals: ["B"] }, { day: 3, title: "Madaba to Petra", description: "Discover Madaba on the way south.", overnight: "Petra", meals: ["B"] }, { day: 4, title: "Petra", description: "Explore the rose-red city.", overnight: "Petra", meals: ["B"] }, { day: 5, title: "Wadi Rum", description: "Desert landscapes and camp stay.", overnight: "Wadi Rum", meals: ["B", "D"] }, { day: 6, title: "Aqaba", description: "Enjoy a relaxed day in Aqaba.", overnight: "Aqaba", meals: ["B"] }, { day: 7, title: "Dead Sea", description: "Time to unwind by the Dead Sea.", overnight: "Dead Sea", meals: ["B"] }, { day: 8, title: "Departure", description: "Transfer to Amman.", overnight: "—", meals: ["B"] }],
    prices: [], included: ["Private transport", "Accommodation", "Daily breakfast", "Selected experiences"], excluded: ["Flights", "Personal expenses"],
    startPoint: "Amman airport", endPoint: "Amman airport", availableDates: "Ask us for upcoming departures", minGroupSize: 4, maxGroupSize: 12, difficulty: "Easy", whatToBring: "Modest layers, walking shoes and sun protection.", practicalNotes: "Departure dates and availability need confirmation.", agentNotes: "This tour is price on request. Never estimate the price; offer WhatsApp handover.", currency: "USD", seasonalNote: "Quote and dates provided by the team.", singleSupplement: 0, priceOnRequest: true,
  },
  {
    title: "Petra Day Trip from Aqaba", slug: "petra-day-trip-from-aqaba", destination: "Jordan", cities: ["Aqaba", "Petra"], category: "Day Trip", durationDays: 1, durationNights: 0, hotelClass: "—",
    shortDescription: "Make the most of a day in Petra with transport from Aqaba.", description: "Travel from Aqaba to Petra for a full day at the ancient Nabataean city, then return to Aqaba.",
    coverImage: "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=1500&q=85", gallery: ["https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=1200&q=80"],
    itinerary: [{ day: 1, title: "Aqaba to Petra and back", description: "Pickup in Aqaba, visit Petra, and return in the evening.", overnight: "Aqaba", meals: [] }],
    prices: [{ groupSize: "1", adult: 250, child: 180, infant: 0 }, { groupSize: "2", adult: 195, child: 150, infant: 0 }, { groupSize: "3", adult: 175, child: 130, infant: 0 }, { groupSize: "4", adult: 165, child: 120, infant: 0 }, { groupSize: "5", adult: 158, child: 115, infant: 0 }, { groupSize: "6+", adult: 150, child: 110, infant: 0 }],
    included: ["Round-trip transport from Aqaba", "English-speaking driver"], excluded: ["Petra entrance ticket", "Meals", "Guide unless requested"],
    startPoint: "Aqaba hotel or port", endPoint: "Aqaba", availableDates: "Daily", minGroupSize: 1, maxGroupSize: 12, difficulty: "Challenging", whatToBring: "Comfortable walking shoes, water and sun protection.", practicalNotes: "Petra is extensive and involves walking over uneven ground.", agentNotes: "Clarify entrance ticket and guide are not included.", currency: "USD", seasonalNote: "", singleSupplement: 0, priceOnRequest: false,
  },
];

const faqs = [
  ["Visa", "Do I need a visa to visit Jordan?", "Visa requirements depend on your nationality and travel plans. Please check with the nearest Jordanian embassy or official government source before travelling; our team can help you understand the tour logistics."],
  ["Visa", "Is the Jordan Pass included?", "The Jordan Pass is not included unless it is explicitly listed in your selected tour's inclusions. Ask our team to confirm for your itinerary."],
  ["Payment", "How can I pay for a tour?", "Contact our team to confirm payment methods and the booking deposit for your selected trip. Payment terms are confirmed with your quote."],
  ["Cancellation", "What is the cancellation policy?", "The cancellation terms are confirmed in your booking documents. As a general guide, cancellation fees may be 25% for cancellations 30 or more days before travel, 50% for 15–29 days, and 75% for 7–14 days. Terms must be confirmed for your booking."],
  ["Cancellation", "Can I change my travel dates?", "Date changes are subject to availability and supplier terms. Contact us as early as possible so we can check your booking."],
  ["Packing", "What should I pack for Jordan?", "Comfortable walking shoes, sun protection, a refillable water bottle, and modest layers are useful. Check the practical notes for your selected tour."],
  ["Packing", "What is the dress code?", "Lightweight, modest clothing is a practical choice when visiting communities and religious sites. Some sites may have additional requirements."],
  ["Safety", "Is Jordan safe for visitors?", "Safety conditions can change. Check current official travel advisories before departure and follow local guidance during your trip."],
  ["Best time to visit", "When is the best time to visit Jordan?", "Spring and autumn are often comfortable seasons for sightseeing. Weather varies by region and date; check a current forecast for your travel dates."],
  ["Other", "Is tipping expected?", "Tipping is discretionary and depends on the service. Ask your guide or our team for current local guidance."],
];

async function main() {
  for (const tour of tours) {
    const { prices, cities, gallery, itinerary, included, excluded, ...fields } = tour;
    await db.tour.upsert({
      where: { slug: tour.slug },
      create: {
        ...fields, status: "PUBLISHED", isSample: true,
        cities: json(cities), gallery: json(gallery), itinerary: json(itinerary),
        included: json(included), excluded: json(excluded),
        prices: { create: prices },
      },
      update: {
        ...fields, status: "PUBLISHED", isSample: true,
        cities: json(cities), gallery: json(gallery), itinerary: json(itinerary),
        included: json(included), excluded: json(excluded),
        prices: { deleteMany: {}, create: prices },
      },
    });
  }

  await db.fAQ.deleteMany();
  await db.fAQ.createMany({ data: faqs.map(([topic, question, answer], index) => ({ topic, question, answer, sortOrder: index })) });
  await db.companyInfo.upsert({
    where: { id: "company" },
    create: { id: "company", name: "Jordan Inspiration Tours", about: "Locally inspired journeys through Jordan and the wider region. Our team helps travellers discover Petra, Wadi Rum, the Dead Sea and more.", phone: "+962 6 555 0100", whatsapp: "+962 79 000 0000", email: "hello@jitours.demo", address: "Amman, Jordan", officeHours: "Sunday–Thursday, 9:00–17:00 (Jordan time)", bookingSteps: "1. Choose a tour. 2. Send your preferred dates and group details. 3. Our team confirms availability and sends your quote. 4. Confirm your booking with the team.", cancellationPolicy: faqs[4][2] },
    update: {},
  });
  await db.agentSettings.upsert({
    where: { id: "agent" },
    create: { id: "agent", name: "Jordan Inspiration Tours", greeting: "Ahlan! I'm your Jordan Inspiration Tours travel assistant. What kind of trip are you dreaming about?", tone: "friendly", replyLength: "short", handoverMessage: "Our travel team can help with availability and a personal quote.", whatsapp: "+962 79 000 0000", collectLeadDetails: true },
    update: {},
  });
  const initialKnowledge = [
    { topic: "How bookings work", content: "A booking is confirmed only after the travel team checks availability and sends written confirmation. Do not tell guests that a request is a confirmed booking." },
    { topic: "Pricing", content: "Tour prices vary by group size. Quote only exact prices from the published tour price table. If a tour is price on request, ask the team to prepare a quote instead." },
  ];
  for (const item of initialKnowledge) {
    await db.knowledgeItem.upsert({ where: { id: item.topic }, create: { id: item.topic, ...item }, update: item });
  }
  console.log(`Seeded ${tours.length} tours, ${faqs.length} FAQs, company info, agent settings and sample agent knowledge.`);
}

main()
  .catch((error) => { console.error("Seed failed:", error); process.exitCode = 1; })
  .finally(async () => { await db.$disconnect(); });
