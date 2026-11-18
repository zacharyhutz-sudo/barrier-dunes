// Search and sharing URLs always use the public domain, including in GitHub Pages builds.
export const publicOrigin = 'https://barrierdunes.org';
export const pages = {
  home: {
    path: '/',
    title: 'Barrier Dunes on Cape San Blas, Florida',
    description: 'Explore Barrier Dunes, a private Gulf-front community on Cape San Blas, Florida. Find condo rentals, beach amenities, community rules, and homeowner resources.',
    photo: 'coast',
  },
  condos: {
    path: '/condos/',
    title: 'Barrier Dunes Condo Rentals on Cape San Blas',
    description: 'Compare privately owned condo rentals at Barrier Dunes on Cape San Blas. See bedrooms, amenities, and community map locations, then check availability with each owner.',
    photo: 'community',
  },
  rules: {
    path: '/rules-and-regulations/',
    title: 'Barrier Dunes Community Rules, Parking & Pets',
    description: 'Find Barrier Dunes rules for parking, pets, pools, beach access, and trash collection. Jump to a topic or download the association’s rules before your stay.',
    photo: 'coast',
  },
  communityResources: {
    path: '/barrier-dunes-resources/',
    title: 'Barrier Dunes HOA Resources & Clubhouse Rental',
    description: 'Find the Barrier Dunes homeowner portal, clubhouse rental agreement, and guidance on whom to contact about rental issues at the Cape San Blas community.',
    photo: 'community',
  },
  attractions: {
    path: '/local-attractions/',
    title: 'Things to Do Near Barrier Dunes on Cape San Blas',
    description: 'Explore St. Joseph Peninsula State Park, Loggerhead Trail, and nearby beaches. Find park directions, dining, and equipment rentals near Barrier Dunes.',
    photo: 'peninsula',
  },
  areaServices: {
    path: '/local-resources/',
    title: 'Cape San Blas Beach Flags & Local Services | Barrier Dunes',
    description: 'Find Cape San Blas beach flag updates, emergency and non-emergency contacts, local addresses, and the Gulf County services directory in one place.',
    photo: 'coast',
  },
} as const;

export const photoDescriptions = {
  coast: 'Aerial view of the Gulf shoreline at Barrier Dunes',
  community: 'Aerial view of the Barrier Dunes community on Cape San Blas',
  peninsula: 'St. Joseph Peninsula State Park on Cape San Blas',
};
