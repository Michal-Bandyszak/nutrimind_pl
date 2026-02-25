// ─────────────────────────────────────────────────────────────────────────────
// Source: "Rutyny na Stabilizację Dopaminy" + "Strategia 1%" (Sports-Med)
// ─────────────────────────────────────────────────────────────────────────────

export type RoutineItem = {
  id: string;
  label: string;
  detail?: string;
};

export const MORNING_ROUTINE: RoutineItem[] = [
  {
    id: 'no_phone_morning',
    label: 'Bez telefonu przez 1.5h od wstania',
    detail: 'Daj mózgowi czas na naturalne przebudzenie bez dopaminowych skoków.',
  },
  {
    id: 'warm_water',
    label: '200 ml ciepłej wody lub naparu z rumianku',
    detail: 'Nawodnienie od pierwszej chwili — żołądek i metabolizm Ci podziękują.',
  },
  {
    id: 'sunlight',
    label: 'Ekspozycja na światło dzienne — 5–15 min',
    detail: 'Wyjdź na balkon lub spacer. Reguluje rytm dobowy i produkcję melatoniny wieczorem.',
  },
  {
    id: 'breathing',
    label: 'Ćwiczenia oddechowe + stretching — 5–15 min',
    detail: 'Technika 4-7-8 lub Wim Hof + dynamiczne rozciąganie. Tlen do mózgu!',
  },
  {
    id: 'cold_shower',
    label: 'Zimny prysznic — 0.5–3 min',
    detail: 'Game changer dla dopaminy, energii i odporności. Zacznij od 30 sek.',
  },
];

export const EVENING_ROUTINE: RoutineItem[] = [
  {
    id: 'no_screen_2030',
    label: 'Brak ekranu po 20:30',
    detail: 'Niebieskie światło LED blokuje melatoninę i zaburza rytm dobowy.',
  },
  {
    id: 'evening_tea',
    label: '200 ml ciepłej wody, melisy lub rumianku',
    detail: 'Melisa redukuje kortyzol i przygotowuje układ nerwowy do wyciszenia.',
  },
  {
    id: 'evening_walk',
    label: 'Wieczorny spacer po kolacji — 5–15 min',
    detail: 'Reguluje glikemię po kolacji i przyspiesza zasypianie.',
  },
  {
    id: 'no_phone_before_sleep',
    label: 'Brak telefonu / TV na 1.5h przed snem',
    detail: 'Ustaw tryb nocny z czerwonym filtrem (Night Shift) jeśli konieczne.',
  },
  {
    id: 'stretching_evening',
    label: 'Stretching 2 min + rollowanie 2 min + mata z kolcami 2 min',
    detail: 'Zdejmuje napięcia z mięśni i aktywuje przywspółczulny układ nerwowy.',
  },
  {
    id: 'warm_shower',
    label: 'Ciepły (nie gorący) prysznic',
    detail: 'Obniżenie temperatury ciała po ciepłym prysznicu przyspiesza zasypianie.',
  },
  {
    id: 'reading',
    label: 'Czytanie książki',
    detail: 'Fizyczna książka — nie czytnik z podświetleniem LED.',
  },
  {
    id: 'sleep_before_2230',
    label: 'Sen przed 22:30',
    detail: 'Pierwsze godziny snu (do ok. 2:00) to najgłębsza regeneracja i wydzielanie GH.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Points system categories (Strategia 1%)
// ─────────────────────────────────────────────────────────────────────────────

export type PointsCategory = {
  id: string;
  label: string;
  levels: [string, string, string]; // descriptions for pts 1, 2, 3
};

export const POINTS_CATEGORIES: PointsCategory[] = [
  {
    id: 'diet',
    label: 'Dieta',
    levels: [
      'Nawodnienie (30 ml × kg mc.) + brak słodkich napojów',
      '+ Brak fast foodów, cukru, oleju palmowego',
      '+ Zaplanowany jadłospis, śniadanie białkowo-tłuszczowe',
    ],
  },
  {
    id: 'supp',
    label: 'Suplementy',
    levels: [
      'D3 (1000–4000 IU) + Omega-3 (EPA + DHA)',
      '+ Magnez, witaminy B lub indywidualnie dobrane',
      '+ Adaptogeny, nootropiki lub suplementy celowane do wyników',
    ],
  },
  {
    id: 'train',
    label: 'Trening',
    levels: [
      'Minimum 8000 kroków lub 20 min aktywności',
      '+ Planowany trening siłowy / cardio',
      '+ Nowa dyscyplina, trener, grupowe zajęcia lub sport',
    ],
  },
  {
    id: 'routine',
    label: 'Rutyna',
    levels: [
      'Minimum 3 pkt z rutyny porannej + 3 pkt wieczornej',
      '+ Pełna rutyna poranna i wieczorna (wszystkie pkt)',
      '+ Stretching, medytacja lub dodatkowy element wyciszenia',
    ],
  },
  {
    id: 'relax',
    label: 'Relaks',
    levels: [
      'Głęboki oddech min. 3× w ciągu dnia (1 min każdy)',
      '+ Przerwy od pracy co 90 min, spacer, muzyka relaksacyjna',
      '+ Medytacja, wizualizacja, masaż lub terapia cieplna/zimna',
    ],
  },
  {
    id: 'mindset',
    label: 'Mindset',
    levels: [
      'Zacznij dzień od 3 rzeczy, za które jesteś wdzięczny/a',
      '+ SMART cel dnia + pozytywna autorefleksja wieczorem',
      '+ Świadome zarządzanie emocjami, eliminacja toksycznych wzorców',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Static health tips (from all 3 documents)
// ─────────────────────────────────────────────────────────────────────────────

export type HealthTip = {
  title: string;
  body: string;
  source?: string;
};

export type TipCategory = {
  id: string;
  label: string;
  emoji: string;
  tips: HealthTip[];
};

export const HEALTH_TIPS: TipCategory[] = [
  {
    id: 'sleep',
    label: 'Sen',
    emoji: '😴',
    tips: [
      {
        title: 'Śpij minimum 7–8 godzin',
        body: 'Sen to regeneracja, nie lenistwo. Chroniczny niedobór snu zwiększa kortyzol, spowalnia metabolizm i pogarsza insulinowrażliwość.',
        source: 'Strategia 1%',
      },
      {
        title: 'Stałe godziny — nawet w weekendy',
        body: 'Wstawanie i kładzenie się o tej samej porze stabilizuje rytm dobowy. Jedna nieprzespana noc tygodniowo niszczy 3–4 dni rytmu.',
        source: 'Rutyny',
      },
      {
        title: 'Sen przed 22:30',
        body: 'Fazy snu głębokiego (NREM 3/4) i wydzielanie hormonu wzrostu (GH) szczytuje między 23:00 a 2:00. Każda godzina spóźnienia obniża jakość regeneracji.',
        source: 'Rutyny / Tipy',
      },
      {
        title: 'Lekka kolacja 3h przed snem',
        body: 'Ciężkie i smażone potrawy podnoszą temperaturę ciała i aktywują trawienie — dwa czynniki zaburzające zasypianie.',
        source: 'Strategia 1%',
      },
      {
        title: 'Wywietrz sypialnię przed snem',
        body: 'Optymalna temperatura snu to 18–19°C. Chłodne powietrze obniża temperaturę ciała — sygnał dla mózgu: czas spać.',
        source: 'Strategia 1%',
      },
    ],
  },
  {
    id: 'morning',
    label: 'Poranna rutyna',
    emoji: '🌅',
    tips: [
      {
        title: '1.5h bez telefonu od wstania',
        body: 'Natychmiastowe sięganie po telefon wywołuje skok dopaminy i kortyzolu. Daj mózgowi czas na naturalne przebudzenie — poprawi to koncentrację przez cały dzień.',
        source: 'Rutyny / Tipy',
      },
      {
        title: 'Poranne słońce — 5–15 minut',
        body: 'Ekspozycja na naturalne światło rano "kalibruje" zegar biologiczny, ogranicza senność w ciągu dnia i ułatwia zaśnięcie wieczorem przez wcześniejsze wydzielanie melatoniny.',
        source: 'Rutyny',
      },
      {
        title: 'Zimny prysznic codziennie',
        body: 'Stymuluje wydzielanie noradrenaliny (+300%) i dopaminy (+250%). Efekty: energia, odporność, lepsza regulacja emocji. Zacznij od 30 sek na koniec ciepłego prysznica.',
        source: 'Tipy (Sylwester, Adrian)',
      },
      {
        title: 'Oddech + stretching rano',
        body: 'Technika 4-7-8 (wdech 4s, zatrzymanie 7s, wydech 8s) aktywuje przywspółczulny układ nerwowy. Dynamiczne rozciąganie poprawia krążenie i zakres ruchu.',
        source: 'Rutyny',
      },
    ],
  },
  {
    id: 'hydration',
    label: 'Nawodnienie i kawa',
    emoji: '💧',
    tips: [
      {
        title: 'Minimalne zapotrzebowanie na wodę',
        body: 'Wzór: 30 ml × masa ciała (kg) w dni bez treningu, 35 ml × masa ciała w dni treningowe i upalne. Przy 80 kg = min. 2400 ml.',
        source: 'Strategia 1%',
      },
      {
        title: 'Szklane butelki, zero plastiku',
        body: 'BPA i ftalany z plastiku zakłócają gospodarkę hormonalną — szczególnie estrogen i testosteron. Butelka ze stali lub szkła to prosta zmiana z dużym efektem.',
        source: 'Strategia 1%',
      },
      {
        title: 'Kawa wyłącznie czarna, max do 16:00',
        body: 'Kofeina ma okres półtrwania ok. 6h. Kawa o 16:00 = połowa kofeiny w mózgu o 22:00. Kawa z mlekiem/cukrem to fast food.',
        source: 'Strategia 1%',
      },
      {
        title: 'Kawa: 40 min przed lub 90 min po posiłku',
        body: 'Kofeina w trakcie posiłku obniża wchłanianie żelaza i cynku nawet o 80%. Nie pij kawy na czczo — podnosi kortyzol.',
        source: 'Strategia 1%',
      },
      {
        title: 'Zero: słodkie napoje, energia, piwo',
        body: 'Colki, energetyki, soki — fosforany, barwniki, skok insuliny. Alkohol to depresant OUN, nie środek relaksacyjny. Nawet jednorazowe spożycie zaburza sen przez 2 dni.',
        source: 'Strategia 1%',
      },
    ],
  },
  {
    id: 'supplements',
    label: 'Suplementy',
    emoji: '💊',
    tips: [
      {
        title: 'D3 — podstawa każdej suplementacji',
        body: 'Przy niedoborach: 4000 IU/dobę. Przy prawidłowych wynikach: 1000–2000 IU. Dąż do górnych wartości zakresu. Wpływa na sen, odporność, nastrój i mineralizację kości.',
        source: 'Strategia 1%',
      },
      {
        title: 'Omega-3 (EPA + DHA)',
        body: 'Zapobiega stanom zapalnym, wspiera pracę mózgu i serca, poprawia profil lipidowy. Przy diecie śródziemnomorskiej ważne, ale warto uzupełniać szczególnie zimą.',
        source: 'Strategia 1%',
      },
      {
        title: 'Magnez — sen, stres, skupienie',
        body: 'Magnez B6 lub Magnesium Bisglycinate przed snem. Bierze udział w ponad 300 reakcjach enzymatycznych. Niedobór = gorsza jakość snu, skurcze mięśni, drażliwość.',
        source: 'Strategia 1%',
      },
      {
        title: 'Suplementy dobieraj do wyników badań',
        body: 'Suplement to nie cukierek. Dobierz je do morfologii, ferrytyny, witaminy D, TSH, insuliny. Bez badań to strzelanie na oślep — niektóre składniki wchodzą w interakcje.',
        source: 'Strategia 1%',
      },
    ],
  },
  {
    id: 'stress',
    label: 'Stres i relaks',
    emoji: '🧘',
    tips: [
      {
        title: 'Głęboki oddech 5× dziennie — minimum',
        body: 'Technika 4-4-4-4: wdech 4s, zatrzymanie 4s, wydech 4s, pauza 4s. Aktywuje przywspółczulny układ nerwowy i obniża kortyzol w ciągu minut.',
        source: 'Rutyny',
      },
      {
        title: 'Technika oddychania Wim Hof',
        body: '30–40 głębokich oddechów, zatrzymanie na wydechu, powtórzenie 3–4 rundy. Zwiększa energię, wytrzymałość i tolerancję na stres. Łączyć z zimnym prysznicem.',
        source: 'Strategia 1%',
      },
      {
        title: 'Przerwy w pracy co 90 minut',
        body: 'Ultradian rhythm — mózg działa w cyklach 90 min skupienia + 20 min odpoczynku. Ignorowanie tej fizjologii = akumulacja kortyzolu i wypalenie.',
        source: 'Rutyny',
      },
      {
        title: 'Eliminuj toksyczne relacje',
        body: 'Otoczenie ma bezpośredni wpływ na kortyzol i dopaminę. Rozmowy z bliskimi obniżają kortyzol. Toksyczne relacje to chroniczny stresor biologiczny.',
        source: 'Strategia 1%',
      },
    ],
  },
  {
    id: 'lab',
    label: 'Badania krwi',
    emoji: '🩸',
    tips: [
      {
        title: 'Podstawowy panel — rób min. raz w roku',
        body: 'Morfologia z rozmazem, CRP, TSH + FT3 + FT4, glukoza i insulina na czczo, lipidogram (cholesterol, LDL, HDL), kreatynina, ALT + AST, żelazo + ferrytyna, kortyzol.',
        source: 'Strategia 1%',
      },
      {
        title: 'Witamina D3 i homocysteina',
        body: 'D3 (25-OH) — niedobór to norma w Polsce. Homocysteina — marker zapalenia i ryzyka CVD, często ignorowana przez lekarzy pierwszego kontaktu.',
        source: 'Strategia 1%',
      },
      {
        title: 'Przy podejrzeniu problemów: DAO, Candida, H. Pylori',
        body: 'Diaminooksydaza (DAO) przy nietolerancji histaminy. Candida albicans IgM i H. Pylori przy problemach trawiennych, wzdęciach, zmęczeniu po posiłkach.',
        source: 'Strategia 1%',
      },
      {
        title: 'Po 50. roku życia: densytometria, PSA/mammografia, kolonoskopia',
        body: 'Profilaktyka ratuje życie. PSA dla mężczyzn, mammografia dla kobiet, kolonoskopia dla wszystkich. Nie czekaj na objawy.',
        source: 'Strategia 1%',
      },
    ],
  },
];
