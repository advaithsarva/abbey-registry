// node backend/update_descriptions.js
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.join(__dirname, '../artwork_registry.db'));

const descriptions = {

  '2016-001':
    `Painted on a single October afternoon in 2015, this street scene captures Lacey's residential streets under a canopy of autumn maples. The composition is modest and unhurried: fallen leaves, ordinary houses, overcast Pacific Northwest light. Ingram had no connection to the abbey at the time of painting; the work entered the collection two years later when he donated it following his first visit. Currently held in storage.`,

  '2018-001':
    `Ingram made two visits to the abbey's east pasture for this work, completing the underpainting on the first morning and returning the following day to resolve the summit snowfields in thick impasto. Mount Rainier sits clear above a pale summer haze, the foreground filled with wild clover and orchard grass. Two of the abbey's fence posts are visible at the right edge of the canvas. Gifted to the collection in May 2018 and installed in the Abbey Church Gallery shortly after.`,

  '2019-001':
    `Fr. Thomas worked on this piece over six weeks, carving the Benedictine motto in deep relief after Vespers each evening using hand gouges from the abbey's original workshop. The western red cedar was harvested from the woodlot on the north side of the property. Letter cavities are filled with hand-tinted beeswax, the colouring drawn from chamomile and sage grown in the monastery garden, which accounts for slight tonal variation between letters. Originally made for the community rather than the collection.`,

  '2020-001':
    `Ellison painted this during a January 2020 retreat at the abbey, attending Lauds each morning and working from observation in the back of the chapel. The painting shows the sanctuary just before the first psalm: lamps lit, windows still dark. Working wet-on-wet on Arches 300gsm hot press, she allows warm gold and cold blue-grey to bleed at their edges rather than meet cleanly. The result holds the particular quality of that hour without resolving it into daylight or darkness.`,

  '2021-001':
    `A sparse composition: an open book, a resting hand, grey light from an unseen window. Brother Paul restricts the palette to ivory, warm grey, and a single dark stroke for the shadow of the hand. The gesso board shows through the thinner passages, lending warmth to an otherwise restrained surface. The work refers to the Benedictine practice of Lectio Divina, the slow, meditative reading of sacred texts, without illustrating it directly.`,

  '2021-002':
    `Puget Sound at low tide, painted in the warm light of late afternoon. Ingram positions the horizon low, giving the sky room to move from warm ochre at the centre to violet at the edges. A few indistinct shapes sit in the middle distance, too far off to identify. The work was dedicated to the abbey in memory of James Ingram, the artist's father, who attended Abbey Church Events concerts for more than twenty years. A dedication plate is fixed to the reverse of the frame.`,

  '2022-001':
    `Park returned to the abbey on three consecutive mornings before finding the light she was after: a single lamp beneath the choir lectern, nothing else illuminated. The two-second exposure records a slight movement in the lampflame, visible on close inspection. The cedar of the stalls, worn smooth over decades of use, reads clearly in the photograph. Printed on Hahnemühle Photo Rag and displayed behind UV glass.`,

  '2022-002':
    `Following Byzantine iconographic tradition, Sister Anne depicts Saint Benedict holding the Rule open to Chapter 72, set against a gold-leaf ground representing uncreated light. Pigments were ground by hand in the monastery; flesh tones are layered over a green underpainting in the Athonite method, built up through successive transparent washes. The gold-leaf halo was applied during the Great Silence on the Feast of St. Thomas Aquinas, 28 January 2022. The icon serves as a devotional focus during the community's annual retreat.`,

  '2022-003':
    `A walnut relief carving depicting an open codex. Fr. Thomas made the inscribed text deliberately illegible, intending the work to be about the transmission of the Rule across fifteen centuries rather than its content. The density and dark colour of black walnut were chosen to convey permanence. The piece is installed in the chapter room, where the Rule is still read aloud in its entirety once each year.`,

  '2023-001':
    `Sister Anne's largest work to date. Gold leaf was torn rather than cut and laid in overlapping fragments, so the surface catches light differently depending on the viewer's position. Vertical forms rise from the gold ground; they are deliberately unresolved, readable as columns, figures, or candlelight. The title refers to the liturgical hour and to the illuminated manuscript tradition that has shaped Sister Anne's practice throughout her career. Commissioned directly for the collection.`,

  '2023-002':
    `A four-minute exposure made on an October evening. The lower half of the tower deepens to near-black while the bell housing at the summit retains the last of the ambient sky. A lit window in one of the monastic cells appears at the lower right; Park chose to retain it rather than wait for the light to be extinguished. Currently in storage, pending installation. The artist has indicated this is the first work in a planned series on the abbey's buildings and grounds.`,

  '2023-003':
    `Thrown on a kick wheel and fired in an anagama wood kiln over three days. The surface glaze is not applied but formed naturally from wood ash that settled on the shoulder of the vessel during firing. The iron-red blush near the base developed where the clay sat closest to the firebox. Ferreira made the opening narrower than is practical for domestic use; the vessel is intended as an object of contemplation rather than utility.`,

  '2023-004':
    `Brother Paul works regularly in encaustic, fusing pigmented beeswax in successive layers with a heat gun and scraping back between each pass. This piece involved approximately thirty such cycles in violet and indigo before the surface reached the depth he was looking for. The gold vertical at the centre was added last. It is slightly irregular and runs the full height of the board. The darkness in the finished work is not uniform; it holds visible depth.`,

  '2024-001':
    `Vasquez attended a public Compline service at the abbey in 2023 and completed this canvas over three consecutive nights shortly afterward. At 120 by 90 centimetres it is the largest work she has donated. The forest canopy is rendered dense enough that no sky is visible. A horizontal band of muted amber applied with a palette knife runs across the middle third of the canvas. Commissioned for the 2024 Abbey Church Events season.`,

  '2024-002':
    `Made during Ellison's second retreat at the abbey, on a grey November morning with rain falling throughout the day. She worked from the east arcade, looking across the cloister garth toward the garden. The wash was applied quickly; the arcade stonework was indicated with a single dry-brush stroke pulled across a nearly dry surface. A small grouping of chrysanthemums in the garden bed provides the only colour in the composition.`,

  '2024-003':
    `A three-panel triptych documenting light movement across the Abbey Church floor over a single day in May. All three panels were photographed from an identical position: thirty-second exposure for morning, sixty seconds for noon, two minutes for Compline. Morning light enters from the southeast clerestory in distinct shafts; noon light spreads evenly across the full width of the floor; Compline light has contracted to a single band along the west wall. Commissioned for the 2024 season. Panels are displayed left to right in chronological order.`,

  '2025-001':
    `A set of seven porcelain bowls corresponding to the seven canonical hours of the Benedictine liturgy: Lauds, Terce, Sext, None, Vespers, Compline, and Vigils. Each bowl was thrown on a separate morning and inscribed on its interior with a single Latin word drawn from the corresponding hour. The celadon glaze, high-fired and slow-cooled, pools slightly deeper in the carved letters, making the inscriptions legible as subtle variations in glaze depth rather than surface marks. Displayed face-up so all seven inscriptions are visible simultaneously.`

};

const stmt = db.prepare('UPDATE artwork SET description = ? WHERE accession_number = ?');
let updated = 0;
db.exec('BEGIN');
try {
  for (const [acc, desc] of Object.entries(descriptions)) {
    const r = stmt.run(desc, acc);
    if (r.changes) { console.log(' ✓', acc); updated++; }
    else console.log(' ? not found:', acc);
  }
  db.exec('COMMIT');
  console.log('\nUpdated', updated, 'artworks.');
} catch (err) {
  db.exec('ROLLBACK');
  console.error('Failed:', err.message);
}
