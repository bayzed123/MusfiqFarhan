/** Runtime configuration for the public site. */

export const API_BASE = (window.MRF_API_URL || 'https://mrf-api.gadget02030.workers.dev').replace(/\/$/, '');

export const SITE = {
  origin: 'https://www.musfiqrfarhan.blog',
  name: 'Musfiq R. Farhan Official',
  person: 'Musfiq R. Farhan',
  email: 'farhanvengers.contact@gmail.com',
  whatsapp: 'https://whatsapp.com/channel/0029VbBdG03HQbS1bTrVHF1X',
  fallbackImage: '/assets/hero_red.png'
};

export const SOCIAL = [
  { label: 'YouTube', href: 'https://youtube.com/@musfiqrfarhan', icon: 'youtube' },
  { label: 'Facebook', href: 'https://www.facebook.com/Musfiqrfarhanofficial/', icon: 'facebook' },
  { label: 'Instagram', href: 'https://www.instagram.com/musfiqfarhan', icon: 'instagram' },
  { label: 'WhatsApp channel', href: SITE.whatsapp, icon: 'whatsapp' },
  { label: 'IMDb', href: 'https://www.imdb.com/name/nm11068428/bio/', icon: 'imdb' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/musfiqrfarhanofficial', icon: 'linkedin' }
];
