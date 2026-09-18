/**
 * The 64 districts of Bangladesh, grouped by division.
 *
 * A letter asks where the writer is from, and a free-text box would answer
 * that in sixty spellings — "Cumilla", "Comilla", "কুমিল্লা", "cumilla sadar".
 * A fixed list keeps the answer groupable, which is the only reason to ask.
 *
 * District only, never a street address: knowing a fan writes from Tangail is
 * the warm part, and asking for more of someone's home address than that is
 * data nobody needs to hold. The upazila beside it stays free text — there
 * are close to five hundred of them and pinning that list down here would be
 * a map to maintain for very little gain.
 */
export const DIVISIONS = [
  { name: 'Barishal', districts: ['Barguna', 'Barishal', 'Bhola', 'Jhalokati', 'Patuakhali', 'Pirojpur'] },
  {
    name: 'Chattogram',
    districts: [
      'Bandarban',
      'Brahmanbaria',
      'Chandpur',
      'Chattogram',
      'Cumilla',
      "Cox's Bazar",
      'Feni',
      'Khagrachhari',
      'Lakshmipur',
      'Noakhali',
      'Rangamati'
    ]
  },
  {
    name: 'Dhaka',
    districts: [
      'Dhaka',
      'Faridpur',
      'Gazipur',
      'Gopalganj',
      'Kishoreganj',
      'Madaripur',
      'Manikganj',
      'Munshiganj',
      'Narayanganj',
      'Narsingdi',
      'Rajbari',
      'Shariatpur',
      'Tangail'
    ]
  },
  {
    name: 'Khulna',
    districts: [
      'Bagerhat',
      'Chuadanga',
      'Jashore',
      'Jhenaidah',
      'Khulna',
      'Kushtia',
      'Magura',
      'Meherpur',
      'Narail',
      'Satkhira'
    ]
  },
  { name: 'Mymensingh', districts: ['Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur'] },
  {
    name: 'Rajshahi',
    districts: [
      'Bogura',
      'Chapai Nawabganj',
      'Joypurhat',
      'Naogaon',
      'Natore',
      'Pabna',
      'Rajshahi',
      'Sirajganj'
    ]
  },
  {
    name: 'Rangpur',
    districts: [
      'Dinajpur',
      'Gaibandha',
      'Kurigram',
      'Lalmonirhat',
      'Nilphamari',
      'Panchagarh',
      'Rangpur',
      'Thakurgaon'
    ]
  },
  { name: 'Sylhet', districts: ['Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet'] }
];

/** Every district name, flat — for validation and for a plain list. */
export const DISTRICTS = DIVISIONS.flatMap((division) => division.districts);

/** `<optgroup>`s for the district picker, division by division. */
export function districtOptionsHtml(selected = '') {
  const escape = (value) =>
    String(value).replace(/[&<>"]/g, (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]
    );
  return DIVISIONS.map(
    (division) => `<optgroup label="${escape(division.name)} Division">${division.districts
      .map(
        (district) =>
          `<option value="${escape(district)}"${district === selected ? ' selected' : ''}>${escape(
            district
          )}</option>`
      )
      .join('')}</optgroup>`
  ).join('');
}
