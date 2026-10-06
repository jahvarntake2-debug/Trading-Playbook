export const demoNeeds = [
  {
    id: 'need-1',
    title: 'Backpacks for Year 7 students',
    description: 'New students need a durable backpack and a complete starter kit for Term 4.',
    category: 'School supplies',
    itemType: 'Backpacks',
    quantityNeeded: 40,
    quantityFulfilled: 18,
    urgency: 'CRITICAL' as const,
    school: { name: 'Henderson North School', suburb: 'Henderson', city: 'Auckland' },
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 'need-2',
    title: 'Exercise books and stationery',
    description: 'A high-use classroom cupboard needs restocking before the next school term begins.',
    category: 'Stationery',
    itemType: 'Notebooks',
    quantityNeeded: 120,
    quantityFulfilled: 52,
    urgency: 'HIGH' as const,
    school: { name: 'Ōtāhuhu Primary School', suburb: 'Ōtāhuhu', city: 'Auckland' },
    image: 'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 'need-3',
    title: 'Scientific calculators',
    description: 'Students in Years 11 to 13 need calculators for maths and science assessments.',
    category: 'Learning tools',
    itemType: 'Calculators',
    quantityNeeded: 25,
    quantityFulfilled: 9,
    urgency: 'MEDIUM' as const,
    school: { name: 'Mt Roskill Grammar', suburb: 'Mt Roskill', city: 'Auckland' },
    image: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=900&q=85',
  },
];

export const supplyImages = {
  pencils: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=1000&q=85',
  classroom: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1000&q=85',
  stationery: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1000&q=85',
};
