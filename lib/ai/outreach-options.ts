export const PERSONALITIES = [
  {
    id: "consultant",
    name: "Consultor",
    description: "Calmo, profissional e interessado no negócio antes da venda.",
    icon: "messages-square",
    aiInstructions:
      "Conduza como um consultor: demonstre interesse genuíno, faça um diagnóstico prudente e proponha o próximo passo sem pressionar.",
    characteristics: ["calmo", "investigativo", "profissional"],
  },
  {
    id: "direct-seller",
    name: "Vendedor direto",
    description: "Confiante e rápido para apresentar o valor da proposta.",
    icon: "zap",
    aiInstructions:
      "Seja objetivo e confiante, apresente rapidamente o valor do serviço e encerre com um CTA simples, sem agressividade.",
    characteristics: ["objetivo", "confiante", "orientado a valor"],
  },
  {
    id: "partner",
    name: "Parceiro",
    description: "Conversa naturalmente e sugere uma parceria, não uma venda fria.",
    icon: "handshake",
    aiInstructions:
      "Converse como um possível parceiro: linguagem natural, colaboração e benefício mútuo, sem soar como uma venda fria.",
    characteristics: ["próximo", "colaborativo", "natural"],
  },
  {
    id: "specialist",
    name: "Especialista",
    description: "Transmite conhecimento do segmento sem parecer arrogante.",
    icon: "badge-check",
    aiInstructions:
      "Demonstre domínio prático do serviço e do contexto disponível, com autoridade serena e sem alegar conhecimento que não foi fornecido.",
    characteristics: ["especializado", "seguro", "didático"],
  },
  {
    id: "entrepreneur",
    name: "Empreendedor",
    description: "Energético, moderno e focado em crescimento e oportunidade.",
    icon: "rocket",
    aiInstructions:
      "Traga energia e visão de crescimento, conectando o serviço a uma oportunidade concreta sem fazer promessas irreais.",
    characteristics: ["energético", "moderno", "orientado a crescimento"],
  },
  {
    id: "friendly-person",
    name: "Gente boa",
    description: "Informal, simpático e humano, sem linguagem corporativa.",
    icon: "smile",
    aiInstructions:
      "Escreva como uma pessoa simpática e acessível, usando linguagem cotidiana e humana, sem jargão corporativo.",
    characteristics: ["simpático", "informal", "humano"],
  },
  {
    id: "strategist",
    name: "Estrategista",
    description: "Encontra nos dados um ângulo específico para iniciar a conversa.",
    icon: "crosshair",
    aiInstructions:
      "Escolha o ângulo mais específico sustentado pelos dados do lead e conecte-o ao serviço oferecido; se faltarem sinais, seja honesto e simples.",
    characteristics: ["analítico", "específico", "orientado a oportunidade"],
  },
  {
    id: "minimalist",
    name: "Minimalista",
    description: "Mensagem extremamente curta, limpa e sem enrolação.",
    icon: "minus",
    aiInstructions:
      "Use o mínimo de palavras possível, mantendo personalização, clareza e um único CTA leve.",
    characteristics: ["curto", "limpo", "essencial"],
  },
] as const;

export type PersonalityId = (typeof PERSONALITIES)[number]["id"];
export type PersonalityIcon = (typeof PERSONALITIES)[number]["icon"];
export const personalityIds = PERSONALITIES.map(({ id }) => id) as [
  PersonalityId,
  ...PersonalityId[],
];

export const TONES = [
  {
    id: "friendly",
    name: "Amigável",
    description: "Natural, próximo e sem parecer vendedor demais.",
    aiInstructions: "Use um tom próximo, receptivo e genuíno.",
  },
  {
    id: "professional",
    name: "Profissional",
    description: "Claro, competente e adequado para qualquer negócio.",
    aiInstructions: "Use um tom competente, claro e equilibrado.",
  },
  {
    id: "formal",
    name: "Formal",
    description: "Mais sério, educado e corporativo.",
    aiInstructions:
      "Use linguagem mais séria e educada, ainda natural e sem fórmulas antiquadas.",
  },
  {
    id: "casual",
    name: "Casual",
    description: "Leve e cotidiano, como uma conversa por mensagem.",
    aiInstructions: "Use linguagem cotidiana, leve e espontânea.",
  },
  {
    id: "direct",
    name: "Direto",
    description: "Vai rapidamente ao ponto e evita introduções longas.",
    aiInstructions: "Vá ao ponto na primeira frase e corte introduções dispensáveis.",
  },
  {
    id: "persuasive",
    name: "Persuasivo",
    description: "Evidencia valor com sutileza, sem pressionar.",
    aiInstructions:
      "Destaque valor e relevância com sutileza, sem urgência artificial ou pressão.",
  },
  {
    id: "consultative",
    name: "Consultivo",
    description: "Parte de uma oportunidade observável antes de oferecer.",
    aiInstructions:
      "Comece por uma oportunidade ou necessidade apenas quando ela estiver sustentada pelos dados recebidos.",
  },
  {
    id: "relaxed",
    name: "Descontraído",
    description: "Solto e bem-humorado, sem perder a clareza.",
    aiInstructions:
      "Use uma voz descontraída e leve, sem piadas forçadas nem excesso de emojis.",
  },
] as const;

export type ToneId = (typeof TONES)[number]["id"];
export const toneIds = TONES.map(({ id }) => id) as [ToneId, ...ToneId[]];

export const APPROACH_LENGTHS = [
  {
    id: "short",
    name: "Curta",
    description: "2 a 3 frases",
    aiInstructions: "Escreva de 2 a 3 frases curtas, com até 70 palavras.",
  },
  {
    id: "normal",
    name: "Normal",
    description: "3 a 5 frases",
    aiInstructions: "Escreva de 3 a 5 frases curtas, com até 110 palavras.",
  },
  {
    id: "detailed",
    name: "Detalhada",
    description: "Até 7 frases",
    aiInstructions:
      "Escreva de 5 a 7 frases curtas, com até 150 palavras, ainda adequada para um primeiro contato.",
  },
] as const;

export type ApproachLengthId = (typeof APPROACH_LENGTHS)[number]["id"];
export const approachLengthIds = APPROACH_LENGTHS.map(({ id }) => id) as [
  ApproachLengthId,
  ...ApproachLengthId[],
];

export const DEFAULT_OUTREACH_PREFERENCES = {
  personality: "partner" as PersonalityId,
  tone: "friendly" as ToneId,
  length: "short" as ApproachLengthId,
};

export function getPersonality(id: PersonalityId) {
  return PERSONALITIES.find((personality) => personality.id === id)!;
}

export function getTone(id: ToneId) {
  return TONES.find((tone) => tone.id === id)!;
}

export function getApproachLength(id: ApproachLengthId) {
  return APPROACH_LENGTHS.find((length) => length.id === id)!;
}

export function isPersonalityId(value: string): value is PersonalityId {
  return personalityIds.includes(value as PersonalityId);
}

export function isToneId(value: string): value is ToneId {
  return toneIds.includes(value as ToneId);
}

export function isApproachLengthId(value: string): value is ApproachLengthId {
  return approachLengthIds.includes(value as ApproachLengthId);
}
