/**
 * One entry per capability page. Adding a capability here creates its page,
 * its card on /capabilities/, its nav entry and its sitemap URL — there is
 * no second place to edit.
 *
 * NOTE FOR JMC: figures in `specs` are the ranges a tool room of this type
 * normally works to. Confirm each against what you actually hold and correct
 * anything that overstates it — a tolerance claim you cannot meet costs more
 * than a modest one.
 */
export const capabilities = [
  {
    slug: 'press-tools',
    nav: 'Press Tools',
    h1: 'Press Tools & Dies',
    title: 'Press Tool Manufacturer in Chennai | Blanking, Piercing & Compound Dies',
    description:
      'Press tool manufacturer in Padi, Chennai. Blanking, piercing, compound and progressive dies in D2 and HCHCr, hardened 58–62 HRC, wire-cut to drawing. Send a drawing for a 24-hour review.',
    summary:
      'Blanking, piercing, forming, bending, compound and progressive dies engineered for precision sheet-metal work at production volume.',
    intro: [
      'A press tool is only as good as the clearance it was built to. We design and manufacture blanking, piercing, compound and progressive dies for sheet-metal components — sized from the strip you are running, not from a catalogue.',
      'Every tool is built around the material you actually press. Cutting clearance is set per side against strip thickness and grade, because a die built for 1.6 mm CRCA will burr and chip if you feed it 2 mm HR.',
    ],
    makes: [
      'Blanking dies — single-station, for flat components at volume',
      'Piercing dies — hole patterns, slots and notches held to pitch',
      'Compound dies — blank and pierce in one stroke, for concentricity',
      'Progressive dies — multi-station strip layout for higher volumes',
      'Bending, forming and restriking tools',
      'Trimming and cut-off tools for formed components',
    ],
    specs: [
      ['Die block and punches', 'D2 / HCHCr, hardened 58–62 HRC'],
      ['Die set and shoes', 'EN8 / mild steel, stress relieved'],
      ['Punch plate and stripper', 'EN8, ground both faces'],
      ['Cutting clearance', 'Set per side against strip thickness and grade'],
      ['Guide pillar and bush', 'Ground and lapped, standard interference fit'],
      ['Profile cutting', 'Wire EDM for punch and die apertures'],
      ['Surface finish', 'Ground flat and parallel on all mating faces'],
    ],
    process: [
      ['Drawing review', 'We check the component for feasibility before quoting — bend radii against material, hole-to-edge distances, and whether the tolerance stack is achievable on a press.'],
      ['Strip layout', 'Blank development, nesting and pitch. This is where material cost per component is won or lost.'],
      ['Tool design', 'Die set sizing, shut height, clearance, stripping force and spring selection.'],
      ['Manufacture', 'Wire EDM for profiles, surface grinding for flatness and parallelism, jig boring for pitch.'],
      ['Tryout', 'First-off samples pressed, checked and corrected before the tool leaves us.'],
    ],
    send: [
      'Component drawing with material grade and thickness',
      'Annual or batch volume, so we size the tool correctly',
      'Your press — tonnage, bolster size, shut height and stroke',
      'Any critical dimensions or tolerances that must be held',
    ],
    faq: [
      {
        q: 'What is the difference between a compound die and a progressive die?',
        a: 'A compound die blanks and pierces the component in a single stroke at one station, which keeps holes concentric to the blank profile. A progressive die moves a strip through several stations, doing one operation at each, and suits higher volumes. Compound gives better concentricity; progressive gives better output per hour.',
      },
      {
        q: 'What cutting clearance do you use?',
        a: 'Clearance is set per side as a percentage of strip thickness, and the percentage depends on the material. Too little clearance causes secondary shear and premature punch wear; too much causes excessive burr and roll-over. We set it against the grade and thickness you actually run, not a single default.',
      },
      {
        q: 'Can you build a tool from a sample part instead of a drawing?',
        a: 'Yes. We reverse-engineer from a physical sample regularly. Send the sample or a dimensioned sketch and we will produce a drawing for your approval before any steel is cut.',
      },
    ],
    industries: ['automotive-tier-1-2', 'two-wheeler-oem', 'sheet-metal-stamping'],
  },

  {
    slug: 'jig-fixtures',
    nav: 'Jig Fixtures',
    h1: 'Jig & Fixture Manufacturing',
    title: 'Jig and Fixture Manufacturer in Chennai | Machining & Welding Fixtures',
    description:
      'Jig and fixture manufacturer in Padi, Chennai. Machining jigs, welding fixtures, assembly and inspection fixtures built on 3-2-1 location for repeatable production. Free drawing review in 24 hours.',
    summary:
      'Custom machining, welding, assembly and inspection fixtures built for repeatability across automotive and industrial production.',
    intro: [
      'A fixture earns its cost by removing variation, not by holding the part. We build machining jigs, welding fixtures, assembly fixtures and checking fixtures that locate off the datums your drawing actually calls out.',
      'Most fixture problems we are asked to fix come from the same three places: locating on a surface that is not a datum, clamping into the cut rather than against a locator, and no thought given to how chips or spatter clear. We design those out before the fixture is made.',
    ],
    makes: [
      'Machining jigs — drilling, milling, boring, tapping',
      'Welding fixtures, including copper-backed and spatter-shielded',
      'Assembly and sub-assembly fixtures',
      'Checking and inspection fixtures with go/no-go elements',
      'Hydraulic, pneumatic and manual clamping arrangements',
      'Multi-part and multi-station fixtures for cell production',
    ],
    specs: [
      ['Base plate', 'EN8 or MS, stress relieved and ground'],
      ['Locators and rest pads', 'EN31 or OHNS, hardened and ground'],
      ['Drill bushes', 'Hardened, slip or press fit to standard'],
      ['Location principle', '3-2-1 unless the drawing datum requires otherwise'],
      ['Clamping', 'Toggle, screw, cam, pneumatic or hydraulic to suit cycle time'],
      ['Pitch accuracy', 'Jig-bored; wire EDM where profile location is critical'],
    ],
    process: [
      ['Datum study', 'We work from the drawing datums. If the datum scheme will not give you a repeatable part, we say so before quoting.'],
      ['Concept', 'Locating and clamping scheme, load and unload access, chip and spatter clearance, operator ergonomics.'],
      ['Design approval', 'You see the fixture design before we cut metal.'],
      ['Manufacture', 'Ground base, hardened locators, bored bush positions.'],
      ['Proving', 'Trial parts run and measured against your drawing.'],
    ],
    send: [
      'Component drawing with datums and critical dimensions marked',
      'The operation the fixture is for — and on which machine',
      'Cycle time and batch size, which decide the clamping method',
      'Whether the operator loads it standing or the fixture sits in a cell',
    ],
    faq: [
      {
        q: 'What is the 3-2-1 principle in fixture design?',
        a: 'Six points constrain a part fully: three on the primary datum face, two on the secondary, one on the tertiary. Constrain any more than that and the fixture fights the part, which shows up as a part that measures differently depending on how hard it was clamped.',
      },
      {
        q: 'Can you build a fixture without a drawing?',
        a: 'We need at minimum a dimensioned sample or sketch, and we need to know which surfaces are the datums. A fixture built from a sample with no datum information will locate repeatably on the wrong thing.',
      },
      {
        q: 'Do you supply the pneumatics and hydraulics too?',
        a: 'Yes — cylinders, valves and clamp elements are specified and supplied as part of the fixture, so you receive something that is ready to connect to air or power.',
      },
    ],
    industries: ['automotive-tier-1-2', 'general-heavy-engineering', 'industrial-automation-spm'],
  },

  {
    slug: 'plastic-moulds',
    nav: 'Plastic Moulds',
    h1: 'Plastic Injection Moulds',
    title: 'Injection Mould Manufacturer in Chennai | Plastic Mould Tool Room',
    description:
      'Plastic injection mould manufacturer in Padi, Chennai. Two-plate and three-plate moulds, multi-cavity tooling, P20 and hardened cores. Send a part drawing for a 24-hour feasibility review.',
    summary:
      'Injection mould tooling for plastic components, designed for dimensional accuracy and long production life.',
    intro: [
      'We build injection mould tooling for plastic components — two-plate and three-plate, single and multi-cavity — designed around the shrinkage of the material you are actually moulding.',
      'Mould cost is decided at the part-design stage, not the tool-design stage. Undercuts that force a side core, wall sections that will sink, and gate positions that weld-line across a cosmetic face are all cheaper to change on your drawing than in hardened steel. We raise them before quoting.',
    ],
    makes: [
      'Two-plate moulds — the standard for most components',
      'Three-plate moulds where gating must be separated from the part',
      'Multi-cavity tooling for volume production',
      'Side-core and slider arrangements for undercuts',
      'Insert-moulding tooling for metal inserts',
      'Mould repair, refurbishment and cavity re-polishing',
    ],
    specs: [
      ['Mould base', 'Standard or custom, to your machine platen and tie-bar spacing'],
      ['Cavity and core', 'P20 pre-hardened, or hardened tool steel for abrasive material'],
      ['Ejection', 'Pin, sleeve, blade or stripper plate to suit the part'],
      ['Cooling', 'Circuits laid to hold cycle time, not added after the fact'],
      ['Shrinkage', 'Applied per the grade you are running, on your confirmation'],
      ['Finish', 'Polished, textured or as-machined per your requirement'],
    ],
    process: [
      ['Part feasibility', 'Draft angles, wall sections, undercuts, likely sink and weld-line positions.'],
      ['Mould design', 'Layout, gating, runner, cooling and ejection, sized to your machine.'],
      ['Design approval', 'Signed off by you before manufacture.'],
      ['Manufacture', 'Machined, EDM where required, fitted and polished.'],
      ['Trial', 'Moulded samples for your dimensional approval before despatch.'],
    ],
    send: [
      'Part drawing or 3D model',
      'Plastic grade and colour — shrinkage depends on both',
      'Your moulding machine: tonnage, platen size, tie-bar spacing, shot weight',
      'Number of cavities you want, and expected annual volume',
      'Cosmetic requirements and any surface that must be witness-free',
    ],
    faq: [
      {
        q: 'How many cavities should my mould have?',
        a: 'It is a trade-off between tool cost and part cost. Higher cavitation lowers cost per part but raises tool cost and needs a larger machine. Tell us your annual volume and target part cost and we will work the number with you rather than guessing.',
      },
      {
        q: 'Can you repair a mould you did not build?',
        a: 'Yes. We take in moulds for cavity repair, core replacement, re-polishing and ejection rework. Send photographs of the damage and a sample of the defective part.',
      },
      {
        q: 'What material do you use for the cavity?',
        a: 'P20 pre-hardened steel covers most applications. For glass-filled or otherwise abrasive materials, or for high-volume tooling, we move to a hardened tool steel — the choice depends on the polymer and the production life you need.',
      },
    ],
    industries: ['plastic-injection-moulding', 'automotive-tier-1-2', 'industrial-automation-spm'],
  },

  {
    slug: 'gauges-and-spm',
    nav: 'Gauges & SPM',
    h1: 'Gauges & Special-Purpose Machines',
    title: 'Gauge Manufacturer in Chennai | Go/No-Go Gauges & SPM Builders',
    description:
      'Inspection gauge and SPM manufacturer in Padi, Chennai. Go/no-go plug and ring gauges, snap gauges, checking fixtures and special-purpose machines built to your quality plan.',
    summary:
      'Inspection gauges, go/no-go gauges, checking fixtures and special-purpose machines built to your quality-control requirements.',
    intro: [
      'A gauge has to be more accurate than the thing it measures, or it is just a second opinion. We build inspection gauges and checking fixtures sized against your drawing tolerance, with gauge tolerance taken as a proportion of the part tolerance.',
      'We also build special-purpose machines where a standard machine cannot do the operation economically — single-purpose assembly, pressing, drilling or checking stations designed around one component.',
    ],
    makes: [
      'Plug gauges — go/no-go, plain and threaded',
      'Ring and snap gauges',
      'Depth, height and position checking gauges',
      'Receiver and profile gauges for formed components',
      'Functional checking fixtures for assemblies',
      'Special-purpose machines for pressing, drilling, assembly and checking',
    ],
    specs: [
      ['Gauge members', 'OHNS or EN31, hardened and lapped'],
      ['Gauge tolerance', 'Taken as a proportion of the component tolerance'],
      ['Wear allowance', 'Applied on go members per the gauging standard used'],
      ['Handles and bodies', 'Knurled, marked with size and go / no-go'],
      ['Marking', 'Permanently etched with nominal size and tolerance'],
      ['SPM structure', 'Fabricated and stress-relieved, ground mounting faces'],
    ],
    process: [
      ['Tolerance study', 'We work back from your part tolerance to a gauge tolerance and wear allowance.'],
      ['Gauge design', 'Type, material and marking scheme, confirmed with you.'],
      ['Manufacture', 'Hardened, ground and lapped to size.'],
      ['Verification', 'Checked before despatch and supplied with recorded sizes.'],
      ['SPM build', 'For machines: concept, design approval, fabrication, assembly and trial.'],
    ],
    send: [
      'Component drawing with the feature and tolerance to be gauged',
      'Which gauging standard you work to',
      'Whether the gauge is for incoming, in-process or final inspection',
      'For an SPM: the operation, the cycle time and the operator interface you want',
    ],
    faq: [
      {
        q: 'How accurate does a gauge need to be?',
        a: 'Gauge tolerance is taken as a fraction of the component tolerance so that gauge error does not consume your working tolerance. We calculate it from your drawing and confirm the figure with you before manufacture.',
      },
      {
        q: 'Do you supply calibration certificates?',
        a: 'Gauges are supplied with recorded actual sizes as manufactured. For traceable third-party calibration certification, tell us at enquiry so it can be arranged as part of the order.',
      },
      {
        q: 'What is an SPM and when is one worth building?',
        a: 'A special-purpose machine does one job for one component. It is worth building when a standard machine is either too slow, too manual or too imprecise for the volume you are running — typically where an operation is repeated thousands of times and consistency matters more than flexibility.',
      },
    ],
    industries: ['automotive-tier-1-2', 'industrial-automation-spm', 'general-heavy-engineering'],
  },

  {
    slug: 'forming-tools',
    nav: 'Forming Tools',
    h1: 'Forming & Deep Draw Tools',
    title: 'Deep Draw & Forming Tool Manufacturer in Chennai | JMC Engineering',
    description:
      'Deep draw and forming tool manufacturer in Padi, Chennai. Draw dies, restrike and compound forming tools for complex sheet-metal geometry with tight tolerance control.',
    summary:
      'Deep draw, stretch forming and compound forming tools for complex geometries that need tight tolerance control.',
    intro: [
      'Forming is where sheet metal stops behaving predictably. Springback, thinning at the draw radius and wrinkling at the flange are all decided by the punch and die radii, the blank holder force and the draw ratio — not by the press.',
      'We build draw dies, restrike tools and compound forming tools designed around the material behaviour, and we say up front where a component will need more than one draw stage.',
    ],
    makes: [
      'Deep draw dies, single and multi-stage',
      'Stretch forming tools',
      'Restrike and sizing tools for post-draw correction',
      'Compound forming tools combining draw with cut',
      'Flanging, curling and beading tools',
      'Bending and channel-forming tools',
    ],
    specs: [
      ['Draw punch and die', 'D2 / HCHCr, hardened and polished on drawing surfaces'],
      ['Draw radii', 'Sized against thickness and grade to control thinning'],
      ['Blank holder', 'Spring or nitrogen cylinder, force set against draw ratio'],
      ['Surface finish', 'Drawing faces polished — a ground finish alone will score'],
      ['Springback', 'Compensated in the tool, confirmed at tryout'],
      ['Stage count', 'Calculated from draw ratio, not assumed'],
    ],
    process: [
      ['Formability review', 'Draw ratio, corner radii, thinning risk and how many stages the part really needs.'],
      ['Blank development', 'Blank size and shape derived for the formed geometry.'],
      ['Tool design', 'Punch and die radii, blank holder arrangement, venting, ejection.'],
      ['Manufacture', 'Machined, hardened and polished on all drawing surfaces.'],
      ['Tryout and correction', 'Springback corrected on the tool against measured samples.'],
    ],
    send: [
      'Component drawing, ideally with the formed geometry in 3D',
      'Material grade, thickness and temper — all three change the result',
      'Press type, tonnage and whether you have blank holder capability',
      'Which formed dimensions are critical and which can move',
    ],
    faq: [
      {
        q: 'Why does my drawn part crack at the corner?',
        a: 'Usually the draw ratio is too aggressive for a single stage, the punch radius is too tight, or blank holder force is too high and the material cannot feed in. It is a tool and process question, not a material defect — send us the part and the tool details and we will tell you which it is.',
      },
      {
        q: 'Can springback be designed out?',
        a: 'It can be compensated for, not eliminated. We overbend or overform in the tool and correct against measured first-off samples at tryout. Springback also shifts with material batch, so a restrike stage is sometimes the more stable answer.',
      },
      {
        q: 'How many draw stages will my part need?',
        a: 'That comes out of the draw ratio between blank diameter and punch diameter, and the material. We calculate it at the feasibility stage rather than discovering it during tryout.',
      },
    ],
    industries: ['sheet-metal-stamping', 'automotive-tier-1-2', 'two-wheeler-oem'],
  },

  {
    slug: 'precision-machining',
    nav: 'Precision Machining',
    h1: 'Precision Machining & Engineering Works',
    title: 'Precision Machining in Chennai | CNC, Wire EDM & Surface Grinding',
    description:
      'Precision machining in Padi, Chennai. 3-axis VMC, wire EDM, surface grinding, turning and milling for tooling components, prototypes and low-volume production.',
    summary:
      'Custom precision machining, component development and prototype manufacturing for one-off and low-volume engineering requirements.',
    intro: [
      'Beyond complete tools, we take on precision machining as a standalone job — tooling components, spares, prototypes and low-volume production runs where the accuracy matters more than the quantity.',
      'This is the same equipment and the same people that build our own tooling, so the work is held to tool-room standards rather than general fabrication standards.',
    ],
    makes: [
      'Tooling components, plates, punches and die inserts',
      'Prototype and first-article components',
      'Replacement and spare parts for existing tooling',
      'Low-volume production machining',
      'Reverse engineering from a sample part',
      'Precision ground plates and blocks to size',
    ],
    specs: [
      ['Wire EDM', 'Micron-level accuracy on intricate tool profiles'],
      ['Surface grinding', 'Mirror finish, tight flatness and parallelism'],
      ['VMC', '3-axis precision CNC for complex components'],
      ['Vertical milling', 'Complex profiles, slots and pocketing'],
      ['Turning', 'Turning, facing, threading and boring'],
      ['Materials', 'Tool steels, EN series, MS, aluminium, and hardened stock'],
    ],
    process: [
      ['Drawing or sample', 'We work from a drawing, a 3D model, or a physical sample.'],
      ['Method and quote', 'Route, workholding and finish confirmed before we start.'],
      ['Machining', 'Wire EDM, VMC, grinding, turning and milling as the part requires.'],
      ['Inspection', 'Checked against your drawing before despatch.'],
    ],
    send: [
      'Drawing, 3D model or physical sample',
      'Material and whether you are supplying it or we are',
      'Quantity — one-off, prototype batch or repeat production',
      'Required finish, and any heat treatment before or after machining',
    ],
    faq: [
      {
        q: 'Will you machine a single component?',
        a: 'Yes. One-off tooling spares and prototypes are routine work for us. Small quantities are not a problem.',
      },
      {
        q: 'Can you machine hardened material?',
        a: 'Yes — wire EDM cuts hardened tool steel to profile, and surface grinding finishes hardened faces to flatness and parallelism.',
      },
      {
        q: 'Can you work from a sample rather than a drawing?',
        a: 'Yes. We reverse-engineer from a physical part and produce a drawing for your approval before machining, so you end up owning the drawing as well as the part.',
      },
    ],
    industries: ['general-heavy-engineering', 'industrial-automation-spm', 'automotive-tier-1-2'],
  },
];

export const bySlug = Object.fromEntries(capabilities.map((c) => [c.slug, c]));
