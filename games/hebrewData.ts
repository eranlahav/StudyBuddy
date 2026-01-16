// Helper for Unicode characters to ensure source code safety
// Aleph-Tav: \u05D0 - \u05EA
// Vowels:
// Kamatz: \u05B8, Patach: \u05B7, Tzeire: \u05B5, Segol: \u05B6
// Hiriq: \u05B4, Holam: \u05B9, Qubuts: \u05BB, Shva: \u05B0, Dagesh: \u05BC
// Shin Dot: \u05C1, Sin Dot: \u05C2

export interface WordItem {
  word: string; // The full word with Niqqud
  emoji: string;
  category: string;
}

// Letters array for random generation
export const LETTERS = [
  '\u05D0', '\u05D1', '\u05D2', '\u05D3', '\u05D4', '\u05D5', '\u05D6', '\u05D7', '\u05D8', '\u05D9', 
  '\u05DB', '\u05DC', '\u05DE', '\u05E0', '\u05E1', '\u05E2', '\u05E4', '\u05E6', '\u05E7', '\u05E8', '\u05E9', '\u05EA'
];

export const FINAL_LETTERS = [
  '\u05DA', '\u05DD', '\u05DF', '\u05E3', '\u05E5' // Khaf, Mem, Nun, Pei, Tsadik Sofit
];

export const VOWELS = [
  { name: 'kamatz', char: '\u05B8' },
  { name: 'patach', char: '\u05B7' },
  { name: 'tzeire', char: '\u05B5' },
  { name: 'segol',  char: '\u05B6' },
  { name: 'hiriq',  char: '\u05B4' },
  { name: 'holam',  char: '\u05B9' }, // Usually goes on top
  { name: 'qubuts', char: '\u05BB' },
  { name: 'shva',   char: '\u05B0' }
];

// Special combo for Holam Male (Vav + Dot)
export const HOLAM_MALE = '\u05D5\u05B9'; 

// 100 Words Database
export const GAME_DATA: WordItem[] = [
  // Animals (Chayot)
  { word: '\u05DB\u05BC\u05B6\u05DC\u05B6\u05D1', emoji: '🐶', category: 'animals' }, // Kelev
  { word: '\u05D7\u05B8\u05EA\u05B5\u05D5\u05BC\u05DC', emoji: '🐱', category: 'animals' }, // Chatul
  { word: '\u05E4\u05BC\u05B4\u05D9\u05DC', emoji: '🐘', category: 'animals' }, // Pil
  { word: '\u05D0\u05B7\u05E8\u05B0\u05D9\u05B5\u05D4', emoji: '🦁', category: 'animals' }, // Aryeh
  { word: '\u05D3\u05BC\u05B8\u05D2', emoji: '🐟', category: 'animals' }, // Dag
  { word: '\u05E6\u05B4\u05E4\u05BC\u05D5\u05B9\u05E8', emoji: '🐦', category: 'animals' }, // Tzipor
  { word: '\u05E4\u05BC\u05B8\u05E8\u05B8\u05D4', emoji: '🐮', category: 'animals' }, // Parah
  { word: '\u05E1\u05D5\u05BC\u05E1', emoji: '🐴', category: 'animals' }, // Sus
  { word: '\u05E7\u05D5\u05B9\u05E3', emoji: '🐒', category: 'animals' }, // Kof
  { word: '\u05E0\u05B8\u05D7\u05B8\u05E9\u05C1', emoji: '🐍', category: 'animals' }, // Nachash
  { word: '\u05D6\u05B0\u05D1\u05B8\u05E8\u05B8\u05D4', emoji: '🦓', category: 'animals' }, // Zebra
  { word: '\u05D2\u05BC\u05B4\u05D9\u05E8\u05B8\u05E4\u05B8\u05D4', emoji: '🦒', category: 'animals' }, // Giraffe
  { word: '\u05D3\u05BC\u05D5\u05B9\u05D1', emoji: '🐻', category: 'animals' }, // Dov
  { word: '\u05E9\u05C1\u05E4\u05B7\u05E0', emoji: '🐇', category: 'animals' }, // Shafan
  { word: '\u05E6\u05B8\u05D1', emoji: '🐢', category: 'animals' }, // Tzav
  { word: '\u05D4\u05B4\u05D9\u05E4\u05BC\u05D5\u05B9', emoji: '🦛', category: 'animals' }, // Hippo
  { word: '\u05EA\u05BC\u05B7\u05E8\u05B0\u05E0\u05B0\u05D2\u05D5\u05B9\u05DC', emoji: '🐓', category: 'animals' }, // Tarnegol
  { word: '\u05D1\u05BC\u05B7\u05E8\u05B0\u05D5\u05B8\u05D6', emoji: '🦆', category: 'animals' }, // Barvaz
  { word: '\u05E4\u05BC\u05B7\u05E8\u05B0\u05E4\u05BC\u05B7\u05E8', emoji: '🦋', category: 'animals' }, // Parpar
  { word: '\u05D3\u05BC\u05D5\u05B9\u05DC\u05B0\u05E4\u05B4\u05D9\u05DF', emoji: '🐬', category: 'animals' }, // Dolphin
  
  // Food (Ochel)
  { word: '\u05EA\u05BC\u05B7\u05E4\u05BC\u05D5\u05B9\u05D7\u05B7', emoji: '🍎', category: 'food' }, // Tapuach
  { word: '\u05D1\u05BC\u05B7\u05E0\u05B8\u05E0\u05B8\u05D4', emoji: '🍌', category: 'food' }, // Banana
  { word: '\u05DC\u05B6\u05D7\u05B6\u05DD', emoji: '🍞', category: 'food' }, // Lechem
  { word: '\u05D2\u05BC\u05B4\u05D9\u05E0\u05B8\u05D4', emoji: '🧀', category: 'food' }, // Gvinah
  { word: '\u05D1\u05BC\u05B5\u05D9\u05E6\u05B8\u05D4', emoji: '🥚', category: 'food' }, // Beitza
  { word: '\u05D2\u05BC\u05B0\u05DC\u05B4\u05D9\u05D3\u05B8\u05D4', emoji: '🍦', category: 'food' }, // Glida
  { word: '\u05E2\u05D5\u05BC\u05D2\u05B8\u05D4', emoji: '🍰', category: 'food' }, // Ugah
  { word: '\u05E4\u05BC\u05B4\u05D9\u05E6\u05B8\u05D4', emoji: '🍕', category: 'food' }, // Pizza
  { word: '\u05DE\u05B7\u05D9\u05B4\u05DD', emoji: '💧', category: 'food' }, // Mayim
  { word: '\u05D7\u05B8\u05DC\u05B8\u05D1', emoji: '🥛', category: 'food' }, // Chalav
  { word: '\u05D0\u05B2\u05D1\u05B7\u05D8\u05BC\u05B4\u05D9\u05D7\u05B7', emoji: '🍉', category: 'food' }, // Avatiach
  { word: '\u05E2\u05B2\u05E0\u05B8\u05D1\u05B4\u05D9\u05DD', emoji: '🍇', category: 'food' }, // Anavim
  { word: '\u05EA\u05BC\u05D5\u05BC\u05EA', emoji: '🍓', category: 'food' }, // Tut
  { word: '\u05D2\u05BC\u05B6\u05D6\u05B6\u05E8', emoji: '🥕', category: 'food' }, // Gezer
  { word: '\u05DE\u05B0\u05DC\u05B8\u05E4\u05B0\u05E4\u05D5\u05B9\u05DF', emoji: '🥒', category: 'food' }, // Melafefon
  { word: '\u05DC\u05B4\u05D9\u05DE\u05D5\u05B9\u05DF', emoji: '🍋', category: 'food' }, // Limon
  { word: '\u05E1\u05B6\u05E0\u05B0\u05D3\u05BC\u05D5\u05B4\u05D9\u05E5\u05F3', emoji: '🥪', category: 'food' }, // Sandwich
  { word: '\u05D4\u05B7\u05DE\u05B0\u05D1\u05B5\u05D5\u05BC\u05E8\u05B0\u05D2\u05B6\u05E8', emoji: '🍔', category: 'food' }, // Hamburger
  { word: '\u05E7\u05B4\u05D9\u05D5\u05B4\u05D9', emoji: '🥝', category: 'food' }, // Kiwi
  { word: '\u05E9\u05C1\u05D5\u05B9\u05E7\u05D5\u05B9\u05DC\u05B8\u05D3', emoji: '🍫', category: 'food' }, // Chocolate

  // Objects (Chafatzim)
  { word: '\u05DB\u05BC\u05B7\u05D3\u05BC\u05D5\u05BC\u05E8', emoji: '⚽', category: 'objects' }, // Kadur
  { word: '\u05E1\u05B5\u05E4\u05B6\u05E8', emoji: '📖', category: 'objects' }, // Sefer
  { word: '\u05E2\u05B4\u05E4\u05BC\u05B8\u05E8\u05D5\u05B9\u05DF', emoji: '✏️', category: 'objects' }, // Iparon
  { word: '\u05DE\u05B4\u05E9\u05C1\u05B0\u05E7\u05B8\u05E4\u05B7\u05D9\u05B4\u05DD', emoji: '👓', category: 'objects' }, // Mishkafayim
  { word: '\u05E9\u05C1\u05B8\u05E2\u05D5\u05B9\u05DF', emoji: '⌚', category: 'objects' }, // Shaon
  { word: '\u05DE\u05B7\u05D7\u05B0\u05E9\u05C1\u05B5\u05D1', emoji: '💻', category: 'objects' }, // Machshev
  { word: '\u05D8\u05B6\u05DC\u05B6\u05E4\u05D5\u05B9\u05DF', emoji: '📱', category: 'objects' }, // Telefon
  { word: '\u05DE\u05B4\u05D8\u05BC\u05B8\u05D4', emoji: '🛏️', category: 'objects' }, // Mitah
  { word: '\u05DB\u05BC\u05B4\u05E1\u05BC\u05B5\u05D0', emoji: '🪑', category: 'objects' }, // Kise
  { word: '\u05DE\u05B7\u05E4\u05B0\u05EA\u05BC\u05B5\u05D7\u05B7', emoji: '🔑', category: 'objects' }, // Mafteach
  { word: '\u05DE\u05B7\u05E6\u05B0\u05DC\u05B5\u05DE\u05B8\u05D4', emoji: '📷', category: 'objects' }, // Matzlemah
  { word: '\u05D1\u05BC\u05B7\u05DC\u05D5\u05B9\u05DF', emoji: '🎈', category: 'objects' }, // Balon
  { word: '\u05DE\u05B7\u05EA\u05BC\u05B8\u05E0\u05B8\u05D4', emoji: '🎁', category: 'objects' }, // Matana
  { word: '\u05E0\u05B5\u05E8', emoji: '🕯️', category: 'objects' }, // Ner
  { word: '\u05DE\u05B7\u05E1\u05BC\u05D5\u05B9\u05E8', emoji: '🪚', category: 'objects' }, // Masor
  { word: '\u05E4\u05BC\u05B7\u05D8\u05BC\u05B4\u05D9\u05E9\u05C1', emoji: '🔨', category: 'objects' }, // Patish
  { word: '\u05DE\u05B4\u05E1\u05B0\u05E4\u05BC\u05B8\u05E8\u05B7\u05D9\u05B4\u05DD', emoji: '✂️', category: 'objects' }, // Misparayim
  { word: '\u05D1\u05BC\u05B7\u05D9\u05B4\u05EA', emoji: '🏠', category: 'objects' }, // Bayit
  { word: '\u05D3\u05BC\u05B6\u05DC\u05B6\u05EA', emoji: '🚪', category: 'objects' }, // Delet
  { word: '\u05D7\u05B7\u05DC\u05D5\u05B9\u05DF', emoji: '🪟', category: 'objects' }, // Chalon

  // Transport (Tachbura)
  { word: '\u05DE\u05B0\u05DB\u05D5\u05B9\u05E0\u05B4\u05D9\u05EA', emoji: '🚗', category: 'transport' }, // Mechonit
  { word: '\u05D0\u05D5\u05B9\u05D8\u05D5\u05B9\u05D1\u05BC\u05D5\u05BC\u05E1', emoji: '🚌', category: 'transport' }, // Otobus
  { word: '\u05E8\u05B7\u05DB\u05BC\u05B6\u05D1\u05B6\u05EA', emoji: '🚂', category: 'transport' }, // Rakevet
  { word: '\u05D0\u05D5\u05B9\u05E4\u05B7\u05E0\u05B7\u05D9\u05B4\u05DD', emoji: '🚲', category: 'transport' }, // Ofanayim
  { word: '\u05DE\u05B8\u05D8\u05D5\u05B9\u05E1', emoji: '✈️', category: 'transport' }, // Matos
  { word: '\u05D0\u05B3\u05E0\u05B4\u05D9\u05BC\u05B8\u05D4', emoji: '🚢', category: 'transport' }, // Oniya
  { word: '\u05DE\u05B7\u05E9\u05C1\u05B8\u05D0\u05B4\u05D9\u05EA', emoji: '🚚', category: 'transport' }, // Masait
  { word: '\u05D0\u05D5\u05B9\u05E4\u05B7\u05E0\u05D5\u05B9\u05E2\u05B7', emoji: '🏍️', category: 'transport' }, // Ofanoa
  { word: '\u05DE\u05D5\u05B9\u05E0\u05B4\u05D9\u05EA', emoji: '🚕', category: 'transport' }, // Monit
  { word: '\u05E7\u05D5\u05B9\u05E8\u05B0\u05E7\u05B4\u05D9\u05E0\u05B6\u05D8', emoji: '🛴', category: 'transport' }, // Korkinet
  { word: '\u05DE\u05B7\u05E1\u05BC\u05D5\u05B9\u05E7', emoji: '🚁', category: 'transport' }, // Masok
  { word: '\u05D8\u05B0\u05E8\u05B7\u05E7\u05D8\u05D5\u05B9\u05E8', emoji: '🚜', category: 'transport' }, // Traktor
  { word: '\u05E1\u05B4\u05D9\u05E8\u05B8\u05D4', emoji: '🚣', category: 'transport' }, // Sirah
  { word: '\u05D0\u05B7\u05DE\u05B0\u05D1\u05BC\u05D5\u05BC\u05DC\u05B7\u05E0\u05B0\u05E1', emoji: '🚑', category: 'transport' }, // Ambulance
  { word: '\u05DB\u05BC\u05B7\u05D1\u05BC\u05B8\u05D0\u05B4\u05D9\u05EA', emoji: '🚒', category: 'transport' }, // Kabait
  { word: '\u05E0\u05D9\u05B8\u05D9\u05B6\u05D3\u05B6\u05EA', emoji: '🚓', category: 'transport' }, // Nayedet
  { word: '\u05D7\u05B2\u05DC\u05B8\u05DC\u05B4\u05D9\u05EA', emoji: '🚀', category: 'transport' }, // Chalalit
  { word: '\u05E8\u05B7\u05DE\u05B0\u05D6\u05D5\u05B9\u05E8', emoji: '🚦', category: 'transport' }, // Ramzor
  { word: '\u05DB\u05BC\u05B0\u05D1\u05B4\u05D9\u05E9\u05C1', emoji: '🛣️', category: 'transport' }, // Kvish
  { word: '\u05D2\u05BC\u05B7\u05DC\u05B0\u05D2\u05BC\u05B7\u05DC', emoji: '🛞', category: 'transport' }, // Galgal

  // Nature (Teva)
  { word: '\u05E9\u05C1\u05B6\u05DE\u05B6\u05E9\u05C1', emoji: '☀️', category: 'nature' }, // Shemesh
  { word: '\u05D9\u05B8\u05E8\u05B5\u05D7\u05B7', emoji: '🌙', category: 'nature' }, // Yareach
  { word: '\u05DB\u05BC\u05D5\u05B9\u05DB\u05B8\u05D1', emoji: '⭐', category: 'nature' }, // Kochav
  { word: '\u05E2\u05B8\u05E0\u05B8\u05DF', emoji: '☁️', category: 'nature' }, // Anan
  { word: '\u05D2\u05BC\u05B6\u05E9\u05C1\u05B6\u05DD', emoji: '🌧️', category: 'nature' }, // Geshem
  { word: '\u05E7\u05B6\u05E9\u05C1\u05B6\u05EA', emoji: '🌈', category: 'nature' }, // Keshet
  { word: '\u05E4\u05BC\u05B6\u05E8\u05B7\u05D7', emoji: '🌸', category: 'nature' }, // Perach
  { word: '\u05E2\u05B5\u05E5', emoji: '🌳', category: 'nature' }, // Etz
  { word: '\u05D4\u05B7\u05E8', emoji: '⛰️', category: 'nature' }, // Har
  { word: '\u05D9\u05B8\u05DD', emoji: '🌊', category: 'nature' }, // Yam
  { word: '\u05D0\u05B5\u05E9\u05C1', emoji: '🔥', category: 'nature' }, // Esh
  { word: '\u05E9\u05C1\u05B6\u05DC\u05B6\u05D2', emoji: '❄️', category: 'nature' }, // Sheleg
  { word: '\u05E2\u05B8\u05DC\u05B6\u05D4', emoji: '🍃', category: 'nature' }, // Aleh
  { word: '\u05E4\u05BC\u05B4\u05D8\u05B0\u05E8\u05B4\u05D9\u05BC\u05B8\u05D4', emoji: '🍄', category: 'nature' }, // Pitriya
  { word: '\u05E7\u05D0\u05B7\u05E7\u05D8\u05D5\u05BC\u05E1', emoji: '🌵', category: 'nature' }, // Kaktus
  { word: '\u05D3\u05BC\u05B6\u05E7\u05B6\u05DC', emoji: '🌴', category: 'nature' }, // Dekel
  { word: '\u05D7\u05B8\u05DE\u05BC\u05B8\u05E0\u05B4\u05D9\u05BC\u05B8\u05D4', emoji: '🌻', category: 'nature' }, // Chamaniya
  { word: '\u05D0\u05B2\u05D3\u05B8\u05DE\u05B8\u05D4', emoji: '🌍', category: 'nature' }, // Adamah
  { word: '\u05D1\u05BC\u05B8\u05E8\u05B8\u05E7', emoji: '⚡', category: 'nature' }, // Barak
  { word: '\u05E8\u05D5\u05BC\u05D7\u05B7', emoji: '💨', category: 'nature' } // Ruach
];