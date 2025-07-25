/**
 * test-phones.js
 * Tests des fonctions de formatage des numéros de téléphone
 */

const { formatPhoneNumber, cleanRawInput, detectPhoneType } = require('./phone-utils');

// Fonction helper pour les tests
function runTest(description, input, expectedOutput, testFunction) {
  const result = testFunction(input);
  const passed = result === expectedOutput;
  console.log(
    `${passed ? '✅' : '❌'} ${description}`,
    passed ? '' : `\n   Attendu: ${expectedOutput}\n   Obtenu:  ${result}`
  );
  return passed;
}

// Tests de cleanRawInput
console.log('\n=== Tests de cleanRawInput ===');
[
  ['Nettoyage basique', '06.12.34.56.78', '0612345678'],
  ['Avec espaces et tirets', '06 12-34-56 78', '0612345678'],
  ['Avec préfixe international', '0032.472.55.33.83', '33612345678'],
  ['Avec caractères spéciaux', '+33 (6) 12.34.56.78', '33612345678'],
  ['Vide', '', ''],
  ['Null', null, ''],
  ['Undefined', undefined, '']
].forEach(([desc, input, expected]) => {
  runTest(desc, input, expected, cleanRawInput);
});

// Tests de formatPhoneNumber
console.log('\n=== Tests de formatPhoneNumber ===');
[
  // France Mobile
  ['Mobile FR simple', '0612345678', '+33612345678'],
  ['Mobile FR formaté', '06.12.34.56.78', '+33612345678'],
  ['Mobile FR avec +33', '+33612345678', '+33612345678'],
  ['Mobile FR avec espaces', '06 12 34 56 78', '+33612345678'],
  ['Mobile FR invalide (court)', '0612345', 'Erreur: Les numéros français doivent contenir exactement 10 chiffres'],
  ['Fixe FR rejeté', '0123456789', 'Erreur: Numéro fixe non autorisé'],
  
  // Suisse
  ['Mobile CH', '41791234567', '+41791234567'],
  ['Fixe CH', '41223456789', '+41223456789'],
  ['CH avec format international', '0041791234567', '+41791234567'],
  
  // Belgique
  ['Mobile BE', '32412345678', '+32412345678'],
  ['BE avec format international', '0032412345678', '+32412345678'],
  
  // Italie
  ['Mobile IT', '393312345678', '+393312345678'],
  ['IT avec format international', '00393312345678', '+393312345678'],
  
  // Andorre
  ['AND standard', '376123456', '+376123456'],
  ['AND avec format international', '00376123456', '+376123456'],
  
  // Réunion
  ['Mobile RUN', '262692123456', '+262692123456'],
  ['Fixe RUN', '262262123456', '+262262123456'],
  
  // Allemagne
  ['DE standard', '49123456789', '+49123456789'],
  ['DE avec format international', '0049123456789', '+49123456789'],
  
  // Cas d'erreur
  ['Vide', '', 'Erreur: Numéro vide'],
  ['Format inconnu', 'abc123', 'Erreur: Numéro non reconnu ou mal formaté'],
  ['Trop court', '123', 'Erreur: Numéro non reconnu ou mal formaté']
].forEach(([desc, input, expected]) => {
  runTest(desc, input, expected, formatPhoneNumber);
});

// Tests de detectPhoneType
console.log('\n=== Tests de detectPhoneType ===');
[
  ['Mobile FR', '0612345678', 'Mobile FR'],
  ['Fixe FR', '0123456789', 'Fixe FR'],
  ['Mobile CH', '41791234567', 'Mobile CH'],
  ['Fixe CH', '41223456789', 'Fixe CH'],
  ['BE', '32412345678', 'BE'],
  ['IT', '393312345678', 'IT'],
  ['AND', '376123456', 'AND'],
  ['Mobile RUN', '262692123456', 'Mobile RUN'],
  ['Fixe RUN', '262262123456', 'Fixe RUN'],
  ['DE', '49123456789', 'DE'],
  ['Format inconnu', '123456789', 'Inconnu']
].forEach(([desc, input, expected]) => {
  runTest(desc, input, expected, detectPhoneType);
});

// Affichage du résumé
console.log('\nTests terminés ! 🎉'); 