/**
 * One entry per industry page. Same rule as capabilities.js — adding an entry
 * here creates the page, the card, the nav entry and the sitemap URL.
 *
 * NOTE FOR JMC: these pages describe the sectors listed on the homepage. Where
 * a page says "typically" it is describing normal practice in that sector, not
 * claiming a specific customer. Once you can name customers, or publish a job
 * with real numbers, those belong here — a named example outperforms every
 * paragraph on the page.
 */
export const industries = [
  {
    slug: 'automotive-tier-1-2',
    nav: 'Automotive',
    h1: 'Tooling for Automotive Tier-1 and Tier-2 Suppliers',
    title: 'Automotive Tooling Supplier, Chennai | Tier-1 & Tier-2 Press Tools & Fixtures',
    description:
      'Press tools, jig fixtures and checking gauges for automotive Tier-1 and Tier-2 suppliers around Chennai. PPAP-ready documentation, drawing review in 24 hours.',
    summary:
      'Press tools, fixtures and gauges for Tier-1 and Tier-2 suppliers feeding the Chennai automotive cluster.',
    intro: [
      'Chennai is one of India\'s densest automotive clusters, and the suppliers in it live or die on repeatability. A tool that produces good parts on Monday and drifting parts on Friday fails a PPAP submission regardless of how well it was made.',
      'We build press tools, fixtures and checking gauges for Tier-1 and Tier-2 suppliers with that in mind: locating on the drawing datums, hardened where it wears, and documented so the tool can be maintained after it leaves us.',
    ],
    needs: [
      ['Repeatability over peak accuracy', 'A tool that holds the middle of tolerance for 100,000 hits is worth more than one that hits nominal on the first part and wanders.'],
      ['Datum discipline', 'Fixtures locate on the drawing datum scheme, so the part measures the same on your CMM as it does in the fixture.'],
      ['Documentation that survives handover', 'Tool drawings, material and hardness records, and spares identified — so a breakdown at 2am is a parts problem, not an archaeology problem.'],
      ['Wear parts planned', 'Punches and locators specified so replacements can be made without re-engineering the tool.'],
    ],
    typical: [
      'Blanking and piercing dies for brackets, clips and reinforcements',
      'Progressive dies for higher-volume stamped components',
      'Machining and welding fixtures for sub-assemblies',
      'Checking fixtures and go/no-go gauges for in-process control',
      'Forming and restrike tools for structural pressings',
    ],
    caps: ['press-tools', 'jig-fixtures', 'gauges-and-spm', 'forming-tools'],
    faq: [
      {
        q: 'Can you supply documentation for a PPAP submission?',
        a: 'We supply tool drawings, material and hardness records and first-off inspection results. The PPAP package itself is submitted by you as the part supplier, but the tooling evidence it needs comes from us — tell us at order stage so it is prepared alongside the tool rather than reconstructed afterwards.',
      },
      {
        q: 'Do you work to customer-specific drawing standards?',
        a: 'Yes. Send the standard with the enquiry. Where an OEM specifies datum schemes, gauge tolerance conventions or marking requirements, we build to that rather than to our default.',
      },
    ],
  },

  {
    slug: 'two-wheeler-oem',
    nav: 'Two-Wheeler',
    h1: 'Tooling for the Two-Wheeler OEM Supply Chain',
    title: 'Two-Wheeler Component Tooling, Chennai | Press Tools & Fixtures',
    description:
      'Press tools, forming dies and fixtures for two-wheeler OEM supply chain components. High-volume sheet-metal tooling built in Padi, Chennai.',
    summary:
      'High-volume press tools and fixtures for suppliers into the two-wheeler OEM supply chain.',
    intro: [
      'Two-wheeler volumes are the highest in Indian manufacturing, and they punish any tool that was not built for the run length. A die that needs regrinding every 20,000 hits stops being an asset and starts being a line-stoppage schedule.',
      'For this sector we build tooling around production life rather than first-article accuracy alone — hardened where it wears, clearances set to keep burr within limits across the run, and punches designed to be replaced without stripping the tool.',
    ],
    needs: [
      ['Run length designed in', 'Tool steel grade and hardness chosen for the number of hits you actually expect, not a nominal figure.'],
      ['Fast punch changes', 'Wear items replaceable without dismantling the die set or losing the setting.'],
      ['Consistent burr', 'Clearance held so burr stays inside limit at the end of the run, not just at the start.'],
      ['Cost per component', 'Strip layout and nesting worked to reduce scrap — at these volumes a millimetre of pitch is real money.'],
    ],
    typical: [
      'Progressive dies for high-volume stamped components',
      'Blanking and piercing tools for brackets and mounting plates',
      'Forming, bending and restrike tools',
      'Welding and assembly fixtures for sub-assemblies',
      'Checking gauges for in-process quality control',
    ],
    caps: ['press-tools', 'forming-tools', 'jig-fixtures', 'gauges-and-spm'],
    faq: [
      {
        q: 'How do you design a tool for high-volume running?',
        a: 'Three things matter most: the tool steel grade and hardness for the expected hits, cutting clearance set so burr stays within limit as punches wear, and wear parts designed to be swapped quickly. Tell us your expected annual volume at enquiry and it changes what we build.',
      },
      {
        q: 'Do you supply spare punches with the tool?',
        a: 'We recommend it and will quote a spares set with the tool. Having the spare made alongside the original, from the same drawing, avoids a rushed remake when the line is down.',
      },
    ],
  },

  {
    slug: 'sheet-metal-stamping',
    nav: 'Sheet Metal',
    h1: 'Tooling for Sheet Metal & Stamping',
    title: 'Sheet Metal Stamping Tool Manufacturer, Chennai | Blanking & Forming Dies',
    description:
      'Sheet-metal stamping tools from Padi, Chennai. Blanking, piercing, forming and deep-draw dies for CRCA, HR, stainless and aluminium at production volume.',
    summary:
      'Blanking, piercing, forming and deep-draw tooling for sheet-metal pressing across grades and thicknesses.',
    intro: [
      'Sheet-metal work is the core of what this tool room does. Blanking, piercing, bending, forming and drawing — across CRCA, hot-rolled, stainless and aluminium, in the thicknesses those grades are actually supplied in.',
      'The grade matters more than most enquiries assume. Cutting clearance, draw radii, springback compensation and blank holder force all change with material and temper, so a tool specified for one grade will not perform on another without rework.',
    ],
    needs: [
      ['Material-specific design', 'Clearance and radii set against the actual grade, thickness and temper you run.'],
      ['Blank development done properly', 'Blank size derived for the formed geometry, not estimated and corrected at tryout.'],
      ['Nesting for material yield', 'Strip layout worked to reduce scrap, which at volume is the largest single cost in the component.'],
      ['Burr control across the run', 'Clearance held so the part still passes at the end of the tool life.'],
    ],
    typical: [
      'Blanking dies for flat components',
      'Piercing tools for hole patterns held to pitch',
      'Compound dies where hole-to-profile concentricity matters',
      'Progressive dies for volume components',
      'Deep draw and forming tools for three-dimensional geometry',
      'Trimming and cut-off tools for formed parts',
    ],
    caps: ['press-tools', 'forming-tools', 'precision-machining'],
    faq: [
      {
        q: 'Which materials do you build tooling for?',
        a: 'CRCA, hot-rolled steel, stainless and aluminium are routine. Tell us the grade, thickness and temper at enquiry — all three change the tool design, and a tool built for the wrong grade will burr, crack or wrinkle.',
      },
      {
        q: 'Can you develop the blank for a formed part?',
        a: 'Yes. Blank development for a formed or drawn component is part of the tool design, and we do it before quoting so the quotation reflects the real material cost per part.',
      },
    ],
  },

  {
    slug: 'plastic-injection-moulding',
    nav: 'Plastic Moulding',
    h1: 'Tooling for Plastic Injection Moulding',
    title: 'Injection Mould Tooling, Chennai | Multi-Cavity & Insert Moulds',
    description:
      'Injection mould tooling for plastic moulders in and around Chennai. Two-plate, three-plate and multi-cavity moulds, plus mould repair and refurbishment.',
    summary:
      'Injection mould tooling, insert-moulding tools and mould refurbishment for plastic moulders.',
    intro: [
      'Moulders need tooling that runs to cycle time and keeps running. A mould with cooling added as an afterthought will hold dimensions and still cost you money on every shot, because the cycle is longer than it needed to be.',
      'We design the cooling circuit as part of the mould rather than around it, and we raise part-design issues — draft, wall section, gate position — before the tool is quoted, while they are still cheap to fix.',
    ],
    needs: [
      ['Cycle time designed in', 'Cooling laid out with the mould, because cooling is most of the cycle.'],
      ['Shrinkage against the real grade', 'Applied for the polymer and colour you are actually running, on your confirmation.'],
      ['Sized to your machine', 'Platen size, tie-bar spacing, shot weight and clamp tonnage checked before design.'],
      ['Maintainable in your own shop', 'Standard components where possible, so a worn ejector pin is a stores item.'],
    ],
    typical: [
      'Two-plate and three-plate moulds',
      'Multi-cavity tooling for volume production',
      'Side-core and slider tooling for undercuts',
      'Insert-moulding tools for metal inserts',
      'Mould repair, cavity re-polishing and core replacement',
      'Trial and sampling before despatch',
    ],
    caps: ['plastic-moulds', 'precision-machining', 'gauges-and-spm'],
    faq: [
      {
        q: 'Will you review my part design before quoting the mould?',
        a: 'Yes, and we would rather do it that way. Draft angles, wall-section changes, undercuts and gate position all move the tool cost, and every one of them is cheaper to change on your drawing than in hardened steel.',
      },
      {
        q: 'Do you repair moulds built elsewhere?',
        a: 'Yes — cavity damage, core replacement, re-polishing and ejection rework are regular jobs. Send photographs of the damage and a sample of the defective part and we will tell you what is involved.',
      },
    ],
  },

  {
    slug: 'general-heavy-engineering',
    nav: 'General Engineering',
    h1: 'Tooling for General & Heavy Engineering',
    title: 'Precision Tooling for General & Heavy Engineering, Chennai',
    description:
      'Machining fixtures, precision components, prototypes and low-volume production for general and heavy engineering firms in Chennai.',
    summary:
      'Machining fixtures, precision components and low-volume production for general and heavy engineering.',
    intro: [
      'General engineering work rarely comes with volume to justify dedicated tooling, but it still needs accuracy. This is where a tool room is most useful — one-off fixtures, precision components, prototypes, and replacement parts for equipment nobody makes spares for any more.',
      'We take this work on the same equipment and to the same standards as our production tooling, which is usually the difference between a part that fits and a part that nearly fits.',
    ],
    needs: [
      ['Small quantities taken seriously', 'One-off and low-volume work is normal here, not an inconvenience.'],
      ['Reverse engineering', 'Where no drawing survives, we produce one from the sample and you keep it.'],
      ['Hardened material handled', 'Wire EDM and grinding let us work material that cannot be conventionally machined.'],
      ['Fast turnaround on breakdowns', 'A machine down waiting on a part is the expensive problem, not the part.'],
    ],
    typical: [
      'Machining and assembly fixtures for one-off or low-volume work',
      'Precision components and ground plates to size',
      'Prototype and first-article parts',
      'Replacement parts reverse-engineered from a sample',
      'Special-purpose machines for repeated manual operations',
    ],
    caps: ['jig-fixtures', 'precision-machining', 'gauges-and-spm'],
    faq: [
      {
        q: 'Will you take a single part?',
        a: 'Yes. One-off components, prototypes and breakdown spares are routine work. Small quantity is not a barrier.',
      },
      {
        q: 'We have no drawing, only the broken part. Can you still help?',
        a: 'Usually yes. We reverse-engineer from the sample and produce a drawing for your approval before machining, so next time you have the drawing as well as the part.',
      },
    ],
  },

  {
    slug: 'industrial-automation-spm',
    nav: 'Automation & SPM',
    h1: 'Tooling for Industrial Automation & SPM',
    title: 'SPM Builders & Automation Tooling, Chennai | JMC Engineering',
    description:
      'Special-purpose machines, automation fixtures and pneumatic and hydraulic tooling for industrial automation, built in Padi, Chennai.',
    summary:
      'Special-purpose machines, automation fixtures and the precision components that automated cells depend on.',
    intro: [
      'Automation removes the operator, and with the operator goes the judgement that used to absorb small variations. Everything an automated cell touches has to locate the same way every cycle, or the cell stops.',
      'We build special-purpose machines and the fixtures, locators and precision components that automated stations rely on — designed around cycle time and around what happens when a part is loaded slightly wrong.',
    ],
    needs: [
      ['Locate without an operator', 'Fixtures that self-locate and will not accept a part loaded the wrong way round.'],
      ['Cycle time as a design input', 'Clamping method and actuation chosen against the cycle you need to hit.'],
      ['Fail safely', 'What the station does when a part is missing or misloaded, decided at design rather than discovered on the line.'],
      ['Serviceable in place', 'Wear items reachable without stripping the station.'],
    ],
    typical: [
      'Special-purpose machines for pressing, drilling, assembly and checking',
      'Pneumatic and hydraulic clamping fixtures',
      'Automation locating and nest fixtures',
      'In-line checking fixtures and gauges',
      'Precision components for automated stations',
    ],
    caps: ['gauges-and-spm', 'jig-fixtures', 'precision-machining'],
    faq: [
      {
        q: 'Do you build the complete machine or just the tooling?',
        a: 'Both. We build complete special-purpose machines — structure, tooling, actuation and controls interface — and we also make fixtures and precision components to fit into an automation system that someone else is integrating.',
      },
      {
        q: 'Can you design poka-yoke into a fixture?',
        a: 'Yes, and we would suggest it. A fixture that physically will not accept a part loaded the wrong way is far more reliable than a sensor that detects it afterwards, and it usually costs less.',
      },
    ],
  },
];

export const bySlug = Object.fromEntries(industries.map((i) => [i.slug, i]));
