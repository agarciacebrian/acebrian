// Calendario anual de reuniones obligatorias
// Genera las próximas reuniones para un año lore a partir de la fecha inicial de la partida.

export interface MeetingSeed {
  organization: string;
  meeting_type: string;
  month: number; // 1-12
  day: number; // 1-28
  agenda: string;
  applies?: (territoryCode: string) => boolean;
}

// Reuniones fijas del calendario diplomático global
// Se aplican a todos salvo que se especifique `applies`
export const ANNUAL_MEETINGS: MeetingSeed[] = [
  {
    organization: "Foro Económico Mundial (Davos)",
    meeting_type: "cumbre_economica",
    month: 1, day: 20,
    agenda: "Reunión anual en Davos. Economía global, riesgos sistémicos, agenda empresarial.",
  },
  {
    organization: "Consejo Europeo",
    meeting_type: "cumbre_UE",
    month: 3, day: 21,
    agenda: "Consejo de primavera de la UE. Agenda de competitividad, energía y defensa.",
    applies: (code) => ["ES", "FR", "DE", "IT", "NL", "PL", "BE", "AT", "PT", "GR", "IE", "FI", "SE", "DK"].includes(code),
  },
  {
    organization: "OTAN",
    meeting_type: "ministerial",
    month: 2, day: 15,
    agenda: "Ministerial de Defensa OTAN. Gasto militar, flanco este, Ucrania.",
    applies: (code) => ["ES", "FR", "DE", "IT", "GB", "US", "NL", "PL", "BE", "TR", "NO", "CA", "DK", "GR", "IS", "PT", "LU", "HR", "RO", "HU", "CZ", "SK", "BG", "SI", "EE", "LV", "LT", "AL", "ME", "MK", "FI", "SE"].includes(code),
  },
  {
    organization: "G20",
    meeting_type: "cumbre_G20",
    month: 11, day: 15,
    agenda: "Cumbre de líderes G20. Macro global, deuda, clima, reforma del sistema financiero.",
  },
  {
    organization: "Asamblea General ONU",
    meeting_type: "AGNU",
    month: 9, day: 22,
    agenda: "Semana de alto nivel AGNU en Nueva York. Discurso, bilaterales, votaciones clave.",
  },
  {
    organization: "SEGIB (Cumbre Iberoamericana)",
    meeting_type: "cumbre_iberoamericana",
    month: 11, day: 8,
    agenda: "Cumbre Iberoamericana. Agenda con España, Portugal, Andorra y América Latina.",
    applies: (code) =>
      ["ES", "PT", "AD", "MX", "AR", "BR", "CL", "CO", "PE", "VE", "UY", "PY", "BO", "EC", "CR", "PA", "DO", "CU", "SV", "GT", "HN", "NI"].includes(code),
  },
  {
    organization: "Banco Asiático de Inversión (AIIB)",
    meeting_type: "consejo_AIIB",
    month: 6, day: 25,
    agenda: "Consejo anual AIIB. Infraestructura, financiación de proyectos asiáticos.",
    applies: (code) =>
      ["ES", "CN", "RU", "IN", "GB", "DE", "FR", "IT", "NL", "KR", "AU", "TR", "SG", "PK", "ID", "TH", "VN", "PH", "MY"].includes(code),
  },
  {
    organization: "Cumbre UE-CELAC",
    meeting_type: "cumbre_UE_CELAC",
    month: 7, day: 17,
    agenda: "Relación birregional UE-América Latina y Caribe. Inversiones, minerales críticos.",
    applies: (code) =>
      ["ES", "PT", "FR", "DE", "IT", "MX", "AR", "BR", "CL", "CO", "PE", "UY", "BO", "EC", "CR", "PA", "DO"].includes(code),
  },
  {
    organization: "FMI & Banco Mundial (Reuniones de Primavera)",
    meeting_type: "IFI",
    month: 4, day: 15,
    agenda: "Reuniones de primavera del FMI y Banco Mundial. Perspectivas globales, deuda soberana.",
  },
];

export function buildMeetingSchedule(
  startDate: string,
  territoryCode: string,
  yearsAhead = 1,
): Array<{ organization: string; meeting_type: string; scheduled_date: string; agenda: string }> {
  const start = new Date(startDate);
  const out: Array<{ organization: string; meeting_type: string; scheduled_date: string; agenda: string }> = [];

  for (let y = 0; y <= yearsAhead; y++) {
    const year = start.getFullYear() + y;
    for (const m of ANNUAL_MEETINGS) {
      if (m.applies && !m.applies(territoryCode)) continue;
      const date = new Date(year, m.month - 1, m.day);
      if (date < start) continue; // solo futuras
      out.push({
        organization: m.organization,
        meeting_type: m.meeting_type,
        scheduled_date: date.toISOString().slice(0, 10),
        agenda: m.agenda,
      });
    }
  }

  out.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  return out;
}
