// ─────────────────────────────────────────────────────────
// CDT Code Reference Database — Canadian dental procedures
//
// category maps to the coverage tier used by most Canadian
// group insurance plans:
//   preventive  → typically 80–100%
//   diagnostic  → typically 80–100%
//   basic       → typically 70–80%
//   major       → typically 50–60%
//   ortho       → typically 50%, lifetime max applies
//   implant     → typically excluded or 0%
// ─────────────────────────────────────────────────────────

export type ProcedureCategory =
  | 'diagnostic'
  | 'preventive'
  | 'basic'
  | 'major'
  | 'ortho'
  | 'implant'

export interface CdtCode {
  code: string
  description: string
  category: ProcedureCategory
  typicalFee: number          // CAD, typical Ontario fee guide
  requiresXray: boolean
  requiresPreAuth: boolean
  frequencyLimitMonths?: number  // how often it can be claimed
  notes?: string
}

export const CDT_DATABASE: Record<string, CdtCode> = {
  // ── Diagnostic ────────────────────────────────────────────
  D0120: { code: 'D0120', description: 'Periodic oral evaluation', category: 'diagnostic', typicalFee: 52,  requiresXray: false, requiresPreAuth: false, frequencyLimitMonths: 6 },
  D0140: { code: 'D0140', description: 'Limited oral evaluation', category: 'diagnostic', typicalFee: 68,  requiresXray: false, requiresPreAuth: false },
  D0150: { code: 'D0150', description: 'Comprehensive oral evaluation (new patient)', category: 'diagnostic', typicalFee: 95,  requiresXray: false, requiresPreAuth: false },
  D0210: { code: 'D0210', description: 'Full mouth radiographic survey (FMX)', category: 'diagnostic', typicalFee: 178, requiresXray: false, requiresPreAuth: false, frequencyLimitMonths: 60 },
  D0220: { code: 'D0220', description: 'Periapical radiograph — first image', category: 'diagnostic', typicalFee: 28,  requiresXray: false, requiresPreAuth: false },
  D0230: { code: 'D0230', description: 'Periapical radiograph — each additional', category: 'diagnostic', typicalFee: 20,  requiresXray: false, requiresPreAuth: false },
  D0270: { code: 'D0270', description: 'Bitewing radiograph — single image', category: 'diagnostic', typicalFee: 28,  requiresXray: false, requiresPreAuth: false, frequencyLimitMonths: 12 },
  D0272: { code: 'D0272', description: 'Bitewing radiographs — two images', category: 'diagnostic', typicalFee: 50,  requiresXray: false, requiresPreAuth: false, frequencyLimitMonths: 12 },
  D0274: { code: 'D0274', description: 'Bitewing radiographs — four images', category: 'diagnostic', typicalFee: 78,  requiresXray: false, requiresPreAuth: false, frequencyLimitMonths: 12 },
  D0330: { code: 'D0330', description: 'Panoramic radiographic image', category: 'diagnostic', typicalFee: 138, requiresXray: false, requiresPreAuth: false, frequencyLimitMonths: 60 },

  // ── Preventive ────────────────────────────────────────────
  D1110: { code: 'D1110', description: 'Prophylaxis — adult cleaning', category: 'preventive', typicalFee: 115, requiresXray: false, requiresPreAuth: false, frequencyLimitMonths: 6,  notes: 'Most plans cover 2 per year.' },
  D1120: { code: 'D1120', description: 'Prophylaxis — child cleaning', category: 'preventive', typicalFee: 80,  requiresXray: false, requiresPreAuth: false, frequencyLimitMonths: 6,  notes: 'Under age 13 in most plans.' },
  D1206: { code: 'D1206', description: 'Topical fluoride varnish', category: 'preventive', typicalFee: 38,  requiresXray: false, requiresPreAuth: false, frequencyLimitMonths: 6 },
  D1351: { code: 'D1351', description: 'Sealant — per tooth', category: 'preventive', typicalFee: 55,  requiresXray: false, requiresPreAuth: false, notes: 'Usually covered for patients under 18.' },
  D1510: { code: 'D1510', description: 'Space maintainer — fixed, unilateral', category: 'preventive', typicalFee: 295, requiresXray: true,  requiresPreAuth: true },

  // ── Basic Restorative ─────────────────────────────────────
  D2140: { code: 'D2140', description: 'Amalgam restoration — 1 surface', category: 'basic', typicalFee: 142, requiresXray: true, requiresPreAuth: false },
  D2150: { code: 'D2150', description: 'Amalgam restoration — 2 surfaces', category: 'basic', typicalFee: 180, requiresXray: true, requiresPreAuth: false },
  D2160: { code: 'D2160', description: 'Amalgam restoration — 3 surfaces', category: 'basic', typicalFee: 218, requiresXray: true, requiresPreAuth: false },
  D2330: { code: 'D2330', description: 'Composite resin — 1 surface, anterior', category: 'basic', typicalFee: 158, requiresXray: true, requiresPreAuth: false },
  D2331: { code: 'D2331', description: 'Composite resin — 2 surfaces, anterior', category: 'basic', typicalFee: 198, requiresXray: true, requiresPreAuth: false },
  D2332: { code: 'D2332', description: 'Composite resin — 3 surfaces, anterior', category: 'basic', typicalFee: 238, requiresXray: true, requiresPreAuth: false },
  D2391: { code: 'D2391', description: 'Composite resin — 1 surface, posterior', category: 'basic', typicalFee: 168, requiresXray: true, requiresPreAuth: false },
  D2392: { code: 'D2392', description: 'Composite resin — 2 surfaces, posterior', category: 'basic', typicalFee: 208, requiresXray: true, requiresPreAuth: false },
  D2393: { code: 'D2393', description: 'Composite resin — 3 surfaces, posterior', category: 'basic', typicalFee: 248, requiresXray: true, requiresPreAuth: false },
  D2394: { code: 'D2394', description: 'Composite resin — 4+ surfaces, posterior', category: 'basic', typicalFee: 288, requiresXray: true, requiresPreAuth: false },

  // ── Endodontics (Basic/Major depending on plan) ───────────
  D3310: { code: 'D3310', description: 'Root canal — anterior tooth', category: 'basic', typicalFee: 695, requiresXray: true, requiresPreAuth: true,  notes: 'X-ray required. Pre-auth strongly recommended.' },
  D3320: { code: 'D3320', description: 'Root canal — premolar', category: 'basic', typicalFee: 820, requiresXray: true, requiresPreAuth: true },
  D3330: { code: 'D3330', description: 'Root canal — molar', category: 'basic', typicalFee: 1050, requiresXray: true, requiresPreAuth: true },
  D3346: { code: 'D3346', description: 'Retreatment — anterior', category: 'major', typicalFee: 895,  requiresXray: true, requiresPreAuth: true },
  D3347: { code: 'D3347', description: 'Retreatment — premolar', category: 'major', typicalFee: 1050, requiresXray: true, requiresPreAuth: true },
  D3348: { code: 'D3348', description: 'Retreatment — molar', category: 'major', typicalFee: 1295, requiresXray: true, requiresPreAuth: true },

  // ── Periodontics ──────────────────────────────────────────
  D4341: { code: 'D4341', description: 'Periodontal scaling and root planing — per quadrant (4+ teeth)', category: 'basic', typicalFee: 248, requiresXray: true, requiresPreAuth: false, frequencyLimitMonths: 24, notes: 'Verify frequency limits — typically covered once every 2 years per quadrant.' },
  D4342: { code: 'D4342', description: 'Periodontal scaling and root planing — per quadrant (1–3 teeth)', category: 'basic', typicalFee: 195, requiresXray: true, requiresPreAuth: false },
  D4355: { code: 'D4355', description: 'Full mouth debridement', category: 'basic', typicalFee: 198, requiresXray: false, requiresPreAuth: false },
  D4381: { code: 'D4381', description: 'Localized delivery of antimicrobial agents', category: 'basic', typicalFee: 95,  requiresXray: false, requiresPreAuth: false },
  D4910: { code: 'D4910', description: 'Periodontal maintenance', category: 'preventive', typicalFee: 158, requiresXray: false, requiresPreAuth: false, frequencyLimitMonths: 3 },

  // ── Major Restorative ─────────────────────────────────────
  D2710: { code: 'D2710', description: 'Crown — resin-based composite (indirect)', category: 'major', typicalFee: 898,  requiresXray: true, requiresPreAuth: true },
  D2712: { code: 'D2712', description: 'Crown — ¾ resin-based composite (indirect)', category: 'major', typicalFee: 868,  requiresXray: true, requiresPreAuth: true },
  D2720: { code: 'D2720', description: 'Crown — resin with high noble metal', category: 'major', typicalFee: 1250, requiresXray: true, requiresPreAuth: true },
  D2740: { code: 'D2740', description: 'Crown — porcelain/ceramic substrate', category: 'major', typicalFee: 1285, requiresXray: true, requiresPreAuth: true },
  D2750: { code: 'D2750', description: 'Crown — porcelain fused to high noble metal', category: 'major', typicalFee: 1350, requiresXray: true, requiresPreAuth: true,  notes: 'Pre-auth required. X-ray and treatment plan required for submission.' },
  D2930: { code: 'D2930', description: 'Prefabricated stainless steel crown — primary tooth', category: 'major', typicalFee: 320, requiresXray: true, requiresPreAuth: false },
  D2931: { code: 'D2931', description: 'Prefabricated stainless steel crown — permanent tooth', category: 'major', typicalFee: 420, requiresXray: true, requiresPreAuth: false },
  D2950: { code: 'D2950', description: 'Core buildup, including any pins when required', category: 'major', typicalFee: 248, requiresXray: true, requiresPreAuth: false },
  D2980: { code: 'D2980', description: 'Crown repair, by report', category: 'major', typicalFee: 195, requiresXray: false, requiresPreAuth: false },

  // ── Prosthodontics ────────────────────────────────────────
  D5110: { code: 'D5110', description: 'Complete denture — maxillary', category: 'major', typicalFee: 1850, requiresXray: true, requiresPreAuth: true },
  D5120: { code: 'D5120', description: 'Complete denture — mandibular', category: 'major', typicalFee: 1850, requiresXray: true, requiresPreAuth: true },
  D5130: { code: 'D5130', description: 'Immediate denture — maxillary', category: 'major', typicalFee: 1950, requiresXray: true, requiresPreAuth: true },
  D5213: { code: 'D5213', description: 'Partial denture — maxillary, cast metal framework', category: 'major', typicalFee: 2200, requiresXray: true, requiresPreAuth: true },
  D5214: { code: 'D5214', description: 'Partial denture — mandibular, cast metal framework', category: 'major', typicalFee: 2200, requiresXray: true, requiresPreAuth: true },

  // ── Oral Surgery ──────────────────────────────────────────
  D7140: { code: 'D7140', description: 'Extraction — erupted tooth or exposed root', category: 'basic', typicalFee: 155, requiresXray: true, requiresPreAuth: false },
  D7210: { code: 'D7210', description: 'Extraction — erupted tooth requiring elevated flap', category: 'basic', typicalFee: 235, requiresXray: true, requiresPreAuth: false },
  D7220: { code: 'D7220', description: 'Removal — impacted tooth, soft tissue', category: 'major', typicalFee: 348, requiresXray: true, requiresPreAuth: true },
  D7230: { code: 'D7230', description: 'Removal — impacted tooth, partially bony', category: 'major', typicalFee: 428, requiresXray: true, requiresPreAuth: true },
  D7240: { code: 'D7240', description: 'Removal — impacted tooth, completely bony', category: 'major', typicalFee: 548, requiresXray: true, requiresPreAuth: true },
  D7310: { code: 'D7310', description: 'Alveoloplasty in conjunction with extractions', category: 'major', typicalFee: 298, requiresXray: false, requiresPreAuth: true },

  // ── Implants ──────────────────────────────────────────────
  D6010: { code: 'D6010', description: 'Surgical placement of implant body: endosteal implant', category: 'implant', typicalFee: 2800, requiresXray: true, requiresPreAuth: true,  notes: 'Typically excluded from group benefit plans. Verify plan directly.' },
  D6012: { code: 'D6012', description: 'Surgical placement: interim implant body', category: 'implant', typicalFee: 1200, requiresXray: true, requiresPreAuth: true },
  D6056: { code: 'D6056', description: 'Prefabricated abutment — includes placement', category: 'implant', typicalFee: 650,  requiresXray: false, requiresPreAuth: true },
  D6059: { code: 'D6059', description: 'Implant/abutment-supported porcelain/ceramic crown', category: 'implant', typicalFee: 1650, requiresXray: true, requiresPreAuth: true },
  D6065: { code: 'D6065', description: 'Implant-supported porcelain fused to metal crown', category: 'implant', typicalFee: 1750, requiresXray: true, requiresPreAuth: true },

  // ── Orthodontics ──────────────────────────────────────────
  D8080: { code: 'D8080', description: 'Comprehensive orthodontic treatment — adolescent', category: 'ortho', typicalFee: 5800, requiresXray: true, requiresPreAuth: true,  notes: 'Lifetime ortho max applies. Most plans pay 50% up to $1,500–$3,000 lifetime.' },
  D8090: { code: 'D8090', description: 'Comprehensive orthodontic treatment — adult', category: 'ortho', typicalFee: 6500, requiresXray: true, requiresPreAuth: true,  notes: 'Many plans exclude adult ortho. Verify plan documents.' },
  D8660: { code: 'D8660', description: 'Pre-orthodontic examination', category: 'ortho', typicalFee: 115, requiresXray: false, requiresPreAuth: false },
}

export function getCdtCode(code: string): CdtCode | undefined {
  return CDT_DATABASE[code.toUpperCase()]
}

export function getAllCdtCodes(): CdtCode[] {
  return Object.values(CDT_DATABASE)
}

export function getCdtCodesByCategory(category: ProcedureCategory): CdtCode[] {
  return Object.values(CDT_DATABASE).filter((c) => c.category === category)
}
