/**
 * phone-utils.js
 * Utilitaires de formatage et validation des numéros de téléphone
 * Pays supportés : FR, CH, BE, ITA, AND, RUN, DE
 */

// Configuration des pays et leurs formats
const COUNTRY_CONFIGS = {
  FR: {
    name: 'France',
    prefix: '33',
    patterns: {
      mobile: {
        startsWith: ['06', '07', '33'],
        length: 10,
        type: 'Mobile FR'
      },
      landline: {
        startsWith: ['01', '02', '03', '04', '05', '09'],
        length: 10,
        type: 'Fixe FR'
      }
    }
  },
  CH: {
    name: 'Suisse',
    prefix: '41',
    patterns: {
      mobile: {
        startsWith: ['417'],
        length: 11,
        type: 'Mobile CH'
      },
      landline: {
        startsWith: ['41'],
        excludeStartsWith: ['417'],
        length: 11,
        type: 'Fixe CH'
      }
    }
  },
  BE: {
    name: 'Belgique',
    prefix: '32',
    patterns: {
      all: {
        startsWith: ['32'],
        length: 11,
        type: 'BE'
      }
    }
  },
  IT: {
    name: 'Italie',
    prefix: '39',
    patterns: {
      all: {
        startsWith: ['39'],
        length: 12,
        type: 'IT'
      }
    }
  },
  AND: {
    name: 'Andorre',
    prefix: '376',
    patterns: {
      all: {
        startsWith: ['376'],
        length: 9,
        type: 'AND'
      }
    }
  },
  RUN: {
    name: 'Réunion',
    prefix: '262',
    patterns: {
      mobile: {
        startsWith: ['262692', '262693'],
        length: 12,
        type: 'Mobile RUN'
      },
      landline: {
        startsWith: ['262262'],
        length: 12,
        type: 'Fixe RUN'
      }
    }
  },
  DE: {
    name: 'Allemagne',
    prefix: '49',
    patterns: {
      all: {
        startsWith: ['49'],
        minLength: 11,
        maxLength: 15,
        type: 'DE'
      }
    }
  }
};

/**
 * Nettoie un numéro de téléphone brut en ne gardant que les chiffres
 * @param {string} phone - Numéro de téléphone brut
 * @returns {string} - Numéro nettoyé (chiffres uniquement)
 */
function cleanRawInput(phone) {
  if (!phone) return '';
  
  // Supprime tous les caractères non numériques sauf +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Si commence par +, on enlève le + et on continue
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  // Gestion des préfixes internationaux
  else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  
  return cleaned;
}

/**
 * Détecte le type de numéro de téléphone (Mobile FR, Fixe CH, etc.)
 * @param {string} phone - Numéro de téléphone (format quelconque)
 * @returns {string} - Type de numéro ou "Inconnu"
 */
function detectPhoneType(phone) {
  const cleaned = cleanRawInput(phone);
  
  // Cas spécial pour les numéros français commençant par 0
  if (cleaned.startsWith('0')) {
    const withoutZero = cleaned.substring(1);
    if (cleaned.length === 10) {
      if (cleaned.startsWith('06') || cleaned.startsWith('07')) {
        return 'Mobile FR';
      }
      if (/^0[1-5]|09/.test(cleaned)) {
        return 'Fixe FR';
      }
    }
  }
  
  // Parcours tous les pays et leurs patterns
  for (const [countryCode, config] of Object.entries(COUNTRY_CONFIGS)) {
    for (const [patternType, pattern] of Object.entries(config.patterns)) {
      // Vérifie si le numéro correspond à un des patterns de début
      const matchesStart = pattern.startsWith.some(start => {
        // Pour les numéros français, on vérifie aussi sans le 0 initial
        if (start === '33' && cleaned.startsWith('0')) {
          return cleaned.substring(1).length === 9;
        }
        return cleaned.startsWith(start);
      });
      
      // Vérifie les exclusions si définies
      const isExcluded = pattern.excludeStartsWith?.some(start => 
        cleaned.startsWith(start)
      ) || false;
      
      // Vérifie la longueur
      const hasValidLength = pattern.length 
        ? cleaned.length === pattern.length
        : cleaned.length >= pattern.minLength && cleaned.length <= pattern.maxLength;
      
      if (matchesStart && !isExcluded && hasValidLength) {
        return pattern.type;
      }
    }
  }
  
  return 'Inconnu';
}

/**
 * Formate un numéro de téléphone au format international
 * @param {string} phone - Numéro de téléphone (format quelconque)
 * @returns {string} - Numéro formaté (+33XXXXXXXXX) ou message d'erreur
 */
function formatPhoneNumber(phone) {
  if (!phone) {
    return 'Erreur: Numéro vide';
  }

  // Nettoyage initial
  const cleaned = cleanRawInput(phone);
  if (!cleaned) {
    return 'Erreur: Numéro invalide après nettoyage';
  }

  // Traitement des numéros français
  if (cleaned.startsWith('0')) {
    // Numéros mobiles (06, 07)
    if (cleaned.startsWith('06') || cleaned.startsWith('07')) {
      if (cleaned.length !== 10) {
        return 'Erreur: Les numéros français doivent contenir exactement 10 chiffres';
      }
      return '+33' + cleaned.substring(1);
    }
    // Rejet des numéros fixes
    if (/^(01|02|03|04|05|09)/.test(cleaned) && cleaned.length === 10) {
      return 'Erreur: Numéro fixe non autorisé';
    }
  }
  // Numéros français avec préfixe international
  else if (cleaned.startsWith('33') && cleaned.length === 11) {
    const withoutPrefix = cleaned.substring(2);
    if (withoutPrefix.startsWith('6') || withoutPrefix.startsWith('7')) {
      return '+' + cleaned;
    }
  }

  // Traitement des numéros suisses
  if (cleaned.startsWith('41')) {
    // Mobile suisse (417)
    if (cleaned.startsWith('417')) {
      if (cleaned.length !== 11) {
        return 'Erreur: Les numéros mobiles suisses doivent contenir exactement 11 chiffres';
      }
      return '+' + cleaned;
    }
    // Fixe suisse
    if (cleaned.length === 11) {
      return '+' + cleaned;
    }
  }

  // Traitement des numéros belges
  if (cleaned.startsWith('32')) {
    if (cleaned.length !== 11) {
      return 'Erreur: Les numéros belges doivent contenir exactement 11 chiffres';
    }
    return '+' + cleaned;
  }

  // Traitement des numéros italiens
  if (cleaned.startsWith('39')) {
    if (cleaned.length !== 12) {
      return 'Erreur: Les numéros italiens doivent contenir exactement 12 chiffres';
    }
    return '+' + cleaned;
  }

  // Traitement des numéros andorrans
  if (cleaned.startsWith('376')) {
    if (cleaned.length !== 9) {
      return 'Erreur: Les numéros andorrans doivent contenir exactement 9 chiffres';
    }
    return '+' + cleaned;
  }

  // Traitement des numéros réunionnais
  if (cleaned.startsWith('262')) {
    // Mobile Réunion
    if (cleaned.startsWith('262692') || cleaned.startsWith('262693')) {
      if (cleaned.length !== 12) {
        return 'Erreur: Les numéros mobiles réunionnais doivent contenir exactement 12 chiffres';
      }
      return '+' + cleaned;
    }
    // Fixe Réunion
    if (cleaned.startsWith('262262')) {
      if (cleaned.length !== 12) {
        return 'Erreur: Les numéros fixes réunionnais doivent contenir exactement 12 chiffres';
      }
      return '+' + cleaned;
    }
  }

  // Traitement des numéros allemands
  if (cleaned.startsWith('49')) {
    if (cleaned.length < 11 || cleaned.length > 15) {
      return 'Erreur: Numéro allemand mal formaté';
    }
    return '+' + cleaned;
  }

  return 'Erreur: Numéro non reconnu ou mal formaté';
}

module.exports = {
  formatPhoneNumber,
  cleanRawInput,
  detectPhoneType
}; 