// lib/questions.ts
// Norwegian "Hvem er mest sannsynlig" questions with tone and risk classification

export type QuestionTone = 'mild' | 'spicy' | 'drøy';
export type QuestionRisk = 'safe' | 'relationship-risk';
export type QuestionCategory = 'standard' | '18+';
export type AdultTone = 'sexy' | 'direct' | 'grisete';

export interface Question {
  text: string;
  tone: QuestionTone;
  risk: QuestionRisk;
}

export interface AdultQuestion {
  text: string;
  category: '18+';
  tone: AdultTone;
  risk: QuestionRisk;
  default18Plus?: boolean;
}

// Standard questions (existing)
export const questions: Question[] = [
  // MILD - SAFE (12)
  { text: "Hvem er mest sannsynlig til å glemme hvor de parkerte bilen?", tone: 'mild', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å sovne på kinoen?", tone: 'mild', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å snakke med seg selv høyt?", tone: 'mild', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å gråte av en reklame?", tone: 'mild', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å bli med på en spontan roadtrip?", tone: 'mild', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å google seg selv?", tone: 'mild', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å miste telefonen på do?", tone: 'mild', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å bli funnet sovende på et merkelig sted?", tone: 'mild', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å glemme bursdagen til noen?", tone: 'mild', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å sende en skjermdump til feil person?", tone: 'mild', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å si noe pinlig foran sjefen?", tone: 'mild', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å snuble på offentlig sted?", tone: 'mild', risk: 'safe' },

  // SPICY - SAFE (8)
  { text: "Hvem er mest sannsynlig til å bli utestengt fra en bar?", tone: 'spicy', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å kaste opp i en taxi?", tone: 'spicy', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å gråte på do på en fest?", tone: 'spicy', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å bli arrestert for noe pinlig?", tone: 'spicy', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å våkne opp med en tatovering de ikke husker?", tone: 'spicy', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å ringe sjefen sin på fylla?", tone: 'spicy', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å gjøre noe dumt på video som går viralt?", tone: 'spicy', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å krasje en bryllupsfest?", tone: 'spicy', risk: 'safe' },

  // SPICY - RELATIONSHIP-RISK (4)
  { text: "Hvem er mest sannsynlig til å sende en melding til eksen klokka 3 om natta?", tone: 'spicy', risk: 'relationship-risk' },
  { text: "Hvem er mest sannsynlig til å hooke med noen de jobber med?", tone: 'spicy', risk: 'relationship-risk' },
  { text: "Hvem er mest sannsynlig til å glemme bursdagen til partneren sin?", tone: 'spicy', risk: 'relationship-risk' },
  { text: "Hvem er mest sannsynlig til å fortelle en hemmelighet de lovte å holde?", tone: 'spicy', risk: 'relationship-risk' },

  // DRØY - SAFE (2)
  { text: "Hvem er mest sannsynlig til å starte en slåsskamp på fylla?", tone: 'drøy', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å bli kastet ut av et hotell?", tone: 'drøy', risk: 'safe' },

  // DRØY - RELATIONSHIP-RISK (4)
  { text: "Hvem er mest sannsynlig til å våkne opp i en fremmed seng uten å huske hvordan de kom dit?", tone: 'drøy', risk: 'relationship-risk' },
  { text: "Hvem er mest sannsynlig til å sende nudes til feil person?", tone: 'drøy', risk: 'relationship-risk' },
  { text: "Hvem er mest sannsynlig til å ha en one night stand med noen i denne gruppa?", tone: 'drøy', risk: 'relationship-risk' },
  { text: "Hvem er mest sannsynlig til å ødelegge noen andres forhold?", tone: 'drøy', risk: 'relationship-risk' },
];

// 18+ Questions - Late Night pack
export const adultQuestions: AdultQuestion[] = [
  // SEXY (1-20)
  { text: "Hvem er mest sannsynlig til å flørte uten å mene noe med det?", category: '18+', tone: 'sexy', risk: 'relationship-risk' },
  { text: "Hvem er mest sannsynlig til å ha sexleketøy liggende lett tilgjengelig?", category: '18+', tone: 'sexy', risk: 'safe', default18Plus: true },
  { text: "Hvem er mest sannsynlig til å tenke \"det der kunne blitt noe mer\" i kveld?", category: '18+', tone: 'sexy', risk: 'relationship-risk' },
  { text: "Hvem er mest sannsynlig til å like dirty talk mer enn de innrømmer?", category: '18+', tone: 'sexy', risk: 'safe', default18Plus: true },
  { text: "Hvem er mest sannsynlig til å sende et frekt bilde bare for moro skyld?", category: '18+', tone: 'sexy', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å bli tent av stemme alene?", category: '18+', tone: 'sexy', risk: 'safe', default18Plus: true },
  { text: "Hvem er mest sannsynlig til å ha sexleketøy de aldri har fortalt noen om?", category: '18+', tone: 'sexy', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å fantasere om noen i dette rommet?", category: '18+', tone: 'sexy', risk: 'relationship-risk' },
  { text: "Hvem er mest sannsynlig til å bli kåt av en helt feil situasjon?", category: '18+', tone: 'sexy', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å være mye mer åpen seksuelt enn folk tror?", category: '18+', tone: 'sexy', risk: 'safe', default18Plus: true },
  { text: "Hvem er mest sannsynlig til å like litt maktspill på soverommet?", category: '18+', tone: 'direct', risk: 'safe', default18Plus: true },
  { text: "Hvem er mest sannsynlig til å ha sexleketøy med app?", category: '18+', tone: 'sexy', risk: 'safe', default18Plus: true },
  { text: "Hvem er mest sannsynlig til å knulle på et upraktisk sted?", category: '18+', tone: 'direct', risk: 'safe', default18Plus: true },
  { text: "Hvem er mest sannsynlig til å like sexleketøy mer enn sexleketøy liker dem?", category: '18+', tone: 'sexy', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å være farligere i senga enn på festen?", category: '18+', tone: 'sexy', risk: 'safe', default18Plus: true },
  { text: "Hvem er mest sannsynlig til å bli kåt av sexleketøy-reklame?", category: '18+', tone: 'sexy', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å ha sexleketøy som andre ville blitt sjokkert av?", category: '18+', tone: 'direct', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å like sexleketøy som ikke er \"vanlige\"?", category: '18+', tone: 'direct', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å bli tent av forbudte tanker?", category: '18+', tone: 'direct', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å ha sexleketøy i håndbagasjen på ferie?", category: '18+', tone: 'sexy', risk: 'safe' },

  // DIRECT (21-38)
  { text: "Hvem er mest sannsynlig til å knulle på første date?", category: '18+', tone: 'direct', risk: 'safe', default18Plus: true },
  { text: "Hvem er mest sannsynlig til å ha hatt sexleketøy i bruk mens andre var i rommet?", category: '18+', tone: 'direct', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å ha ligget med noen bare fordi de var kåte?", category: '18+', tone: 'direct', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å knulle uten å huske detaljene etterpå?", category: '18+', tone: 'direct', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å ha sexleketøy gjemt på jobb?", category: '18+', tone: 'direct', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å ha hatt sexleketøy med noen de ikke burde?", category: '18+', tone: 'direct', risk: 'relationship-risk' },
  { text: "Hvem er mest sannsynlig til å like sexleketøy som gjør litt vondt?", category: '18+', tone: 'direct', risk: 'safe', default18Plus: true },
  { text: "Hvem er mest sannsynlig til å knulle bare for å få det ut av systemet?", category: '18+', tone: 'direct', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å ha sexleketøy som aldri blir brukt – men som er helt sinnssykt?", category: '18+', tone: 'direct', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å knulle på et offentlig sted?", category: '18+', tone: 'direct', risk: 'safe', default18Plus: true },
  { text: "Hvem er mest sannsynlig til å ha sexleketøy de skammer seg litt over?", category: '18+', tone: 'direct', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å knulle selv om de vet det er en dårlig idé?", category: '18+', tone: 'direct', risk: 'relationship-risk' },
  { text: "Hvem er mest sannsynlig til å like sexleketøy som involverer binding?", category: '18+', tone: 'direct', risk: 'safe', default18Plus: true },
  { text: "Hvem er mest sannsynlig til å knulle noen bare fordi stemningen var riktig?", category: '18+', tone: 'direct', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å ha sexleketøy som er ulovlig i minst ett land?", category: '18+', tone: 'grisete', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å knulle uten følelser – og være helt ok med det?", category: '18+', tone: 'direct', risk: 'safe', default18Plus: true },
  { text: "Hvem er mest sannsynlig til å ha sexleketøy i nattbordet akkurat nå?", category: '18+', tone: 'direct', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å knulle noen de aldri burde knulle igjen?", category: '18+', tone: 'direct', risk: 'relationship-risk' },

  // GRISETE (39-56)
  { text: "Hvem er mest sannsynlig til å knulle mer enn én person samme kveld?", category: '18+', tone: 'grisete', risk: 'relationship-risk' },
  { text: "Hvem er mest sannsynlig til å ha sexleketøy som ville blitt sensurert på TV?", category: '18+', tone: 'grisete', risk: 'safe', default18Plus: true },
  { text: "Hvem er mest sannsynlig til å knulle på nach bare fordi de er kåte?", category: '18+', tone: 'grisete', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å like sexleketøy som involverer dominans?", category: '18+', tone: 'direct', risk: 'safe', default18Plus: true },
  { text: "Hvem er mest sannsynlig til å knulle uten å vite navnet dagen etter?", category: '18+', tone: 'grisete', risk: 'safe', default18Plus: true },
  { text: "Hvem er mest sannsynlig til å ha sexleketøy som ingen andre får røre?", category: '18+', tone: 'direct', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å knulle selv om de vet de kommer til å angre?", category: '18+', tone: 'grisete', risk: 'relationship-risk' },
  { text: "Hvem er mest sannsynlig til å like sexleketøy som er altfor mye?", category: '18+', tone: 'grisete', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å knulle noen bare for historien?", category: '18+', tone: 'grisete', risk: 'safe', default18Plus: true },
  { text: "Hvem er mest sannsynlig til å ha sexleketøy som burde kommet med advarsel?", category: '18+', tone: 'grisete', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å knulle på et sted de aldri burde knulle?", category: '18+', tone: 'grisete', risk: 'safe', default18Plus: true },
  { text: "Hvem er mest sannsynlig til å like sexleketøy som involverer flere personer?", category: '18+', tone: 'grisete', risk: 'relationship-risk' },
  { text: "Hvem er mest sannsynlig til å knulle bare fordi de kan?", category: '18+', tone: 'grisete', risk: 'safe', default18Plus: true },
  { text: "Hvem er mest sannsynlig til å knulle midt på dagen uten noen grunn?", category: '18+', tone: 'direct', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å like sexleketøy som er fysisk slitsomme?", category: '18+', tone: 'grisete', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å knulle uten å bry seg om konsekvensene?", category: '18+', tone: 'grisete', risk: 'relationship-risk' },
  { text: "Hvem er mest sannsynlig til å knulle bare fordi stemningen er farlig?", category: '18+', tone: 'grisete', risk: 'safe' },
  { text: "Hvem er mest sannsynlig til å knulle igjen rett etterpå?", category: '18+', tone: 'grisete', risk: 'safe', default18Plus: true },
];

// Get default 18+ questions (the best 20)
export function getDefault18PlusQuestions(): AdultQuestion[] {
  return adultQuestions.filter(q => q.default18Plus === true);
}

// Get all 18+ questions
export function getAll18PlusQuestions(): AdultQuestion[] {
  return adultQuestions;
}
