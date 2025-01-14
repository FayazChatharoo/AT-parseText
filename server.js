/**************************************************
 * server.js
 * Description:
 *  - Mini-serveur Node/Express qui reçoit 
 *    `{ summary, description }` et renvoie 
 *    un JSON avec type, prénom, nom, 
 *    téléphone formaté, prix etc.
 **************************************************/

const express = require('express');
const app = express();

// --- Pour qu'Express sache parser du JSON dans le body ---
app.use(express.json());

// PORT pour Render ou local
const PORT = process.env.PORT || 3000;

/**************************************************
 * 1) Fonction de parsing du "summary"
 *    - summary: ex. "Dom Marie 06.56.91.39.62"
 *    - Objectif: extraire "type", "prenom", "phoneBrut"
 **************************************************/
function parseSummary(summaryRaw) {
  // On met un fallback si jamais summaryRaw est vide ou undefined
  const summary = summaryRaw || '';

  /**************************************************
   * Regex:
   *  ^(\S+)            --> 1er bloc (type)
   *  \s+               --> au moins un espace
   *  (.+)              --> 2e bloc "tout le reste" 
   *  \s+               --> espace
   *  ([\d .+\-()/]+)$  --> 3e bloc = num tel brut, 
   *                       jusqu'à la fin de la chaîne
   *
   * Le "i" indique qu'on ignore la casse (DOM, doM, etc.)
   **************************************************/
  const mainRegex = /^(\S+)\s+(.+)\s+([\d .+\-()/]+)$/i;
  const match = summary.match(mainRegex);

  // Par défaut, on prépare un objet "vide" si pas de match
  let type = null;
  let prenom = null;
  let phoneBrut = null;

  // Si on a un match, on attribue les valeurs
  if (match) {
    type = match[1];       // ex. "Dom", "tel", "Skype"
    prenom = match[2];     // ex. "Dominique" ou "Jean-Claude"
    phoneBrut = match[3];  // ex. "06.56.91.39.62"
  }

  // Normalisation du "type" en minuscules
  // et correction des fautes fréquentes
  if (type) {
    const lower = type.toLowerCase();
    if (lower.startsWith('tel') || lower.startsWith('tél')) {
      type = 'tel';
    } else if (lower.startsWith('dom')) {
      type = 'dom';
    } else if (
      lower.startsWith('sky')  || 
      lower.startsWith('skipe')|| 
      lower.startsWith('skaipe')
    ) {
      type = 'skype';
    } else {
      // On peut laisser type = lower si tu veux normaliser tout
      type = lower;
    }
  }

  return { type, prenom, phoneBrut };
}

/**************************************************
 * 2) Fonction de parsing de la description
 *    - description: ex. "Mme Dupont Rendezvous... xxx euros"
 *    - Objectif: extraire "nomFamille" et "prix"
 **************************************************/
function parseDescription(descriptionRaw) {
  // Fallback si descriptionRaw est null ou undef
  const description = descriptionRaw || '';

  // 2.1) Retirer préfixes type "Mme", "Mr", "Mlle", "M." etc.
  // On supprime ces mots pour ne pas fausser la détection du nom
  const withoutPrefixes = description.replace(
    /\b(mme\.?|mr\.?|m\.|mlle\.?|madame|monsieur)\b/gi,
    ''
  ).trim();

  // 2.2) Extraire le premier mot comme nom de famille (approche basique)
  // On "split" par espaces
  const words = withoutPrefixes.split(/\s+/);
  let nomFamille = null;
  if (words.length > 0 && words[0].length > 0) {
    nomFamille = words[0];
  }

  // 2.3) Extraire un prix (nombre + euros/€) ex. "170 euros", "340€", "150", etc.
  // Regex: 
  //   (\d{2,4}) --> 2 à 3 chiffres (ex. 170, 340, 1500)
  //   \s*       --> éventuellement des espaces
  //   (?:€|euros)? --> éventuellement le symbole € ou "euros"
  const priceRegex = /(\d{2,3})\s*(?:€|euros)?/i;
  const priceMatch = description.match(priceRegex);
  
  let prix = null;
  if (match) {
    prix = match[1]; // ex. "170"
  } else {
    // Si aucun prix n'est trouvé,
    // on fixe un "prix" par défaut.
    prix = '170';
  }

  return { nomFamille, prix };
}

/**************************************************
 * 3) Fonction de "nettoyage" + formatage d'un numéro
 *    - Enlève les caractères non numériques (sauf +)
 *    - Détermine l'indicatif:
 *      - France (commençant par 0, on bascule en +33)
 *      - Belgique (0032, etc.)
 *      - Suisse (0041 ou 41), 
 *      - Réunion (0262 => +262, ou besoin d'autres règles ?)
 *    - Sinon renvoie "Erreur: Numéro non reconnu ou mal formaté"
 **************************************************/
function formatPhoneNumber(phoneRaw) {
  // Sécurité si phoneRaw est null ou undefined
  const phone = phoneRaw || '';
  
  // Nettoyer: enlever tout sauf + et chiffres
  let cleaned = phone.replace(/[^\d+]/g, '');

  // 1) Vérif si c'est un format France "0X... (10 chiffres)"
  //    => ex. 06, 07 => mobile, 02 => possible (Réunion) ?
  //    On peut distinguer mobiles / fixes ou laisser simple
  //    Ici, on va simplifier: tout 0X (10 chiffres) => +33
  const frenchMobile = /^(0\d{9})$/;  
  if (frenchMobile.test(cleaned)) {
    // On retire le "0" et on rajoute +33
    return '+33' + cleaned.substring(1);
  }

  // 2) Belgique: "0032" + 7 chiffres (11 total)
  //    ou "0032" + 8, selon si on inclut le 0... 
  //    On peut adapter la longueur selon la norme
  if (/^0032\d{7,8}$/.test(cleaned)) {
    // On supprime 4 chars "0032" => +32
    return '+32' + cleaned.substring(4);
  }

  // 3) Suisse: "0041" + 9 => 13 total
  if (/^0041\d{9}$/.test(cleaned)) {
    return '+41' + cleaned.substring(4);
  }
  // Suisse: "41" + 9 => 11 total
  if (/^41\d{9}$/.test(cleaned)) {
    return '+41' + cleaned.substring(2);
  }

  // 4) Réunion: indicatif +262
  //    ex. 0262XX... => 10 chiffres => +262262XX...
  //    On peut faire un test plus précis, ici c'est un exemple
  //    Reconnu si commence par 0262 et fait 9 ou 10 chiffres, etc.
  if (/^0262\d{6,7}$/.test(cleaned)) {
    return '+262' + cleaned.substring(1); 
  }

  // 5) Si c'est déjà en format +33, +41, +32, +262, etc.
  //    On peut juste le retourner tel quel si c'est plausible
  //    Ex. if cleaned.startsWith('+33') -> return cleaned;
  //    (Tu peux ajouter d'autres conditions si tu veux)
  if (/^\+(\d{2,3})\d+/.test(cleaned)) {
    // on suppose que c'est déjà un indicatif international correct
    return cleaned;
  }

  // Sinon, pas reconnu
  return 'Erreur: Numéro non reconnu ou mal formaté';
}

/**************************************************
 * 4) ROUTE PRINCIPALE: /parse
 *    - Reçoit { summary, description }
 *    - Parse le summary => type, prenom, phoneBrut
 *    - Parse la description => nomFamille, prix
 *    - Formate le numéro => telephone
 *    - Renvoie un JSON final
 **************************************************/
app.post('/parse', (req, res) => {
  // 4.1) Récupérer le body
  const { summary, description } = req.body;

  // 4.2) Parser le summary
  const { type, prenom, phoneBrut } = parseSummary(summary);

  // Si on n'a ni type ni phoneBrut, c'est un échec de parsing
  if (!type || !phoneBrut) {
    return res.json({
      status: 'error',
      message: 'Impossible de parser le summary correctement',
      summary
    });
  }

  // 4.3) Formater le numéro
  const telephone = formatPhoneNumber(phoneBrut);

  // 4.4) Parser la description
  const { nomFamille, prix } = parseDescription(description);

  // 4.5) Construire la réponse finale
  // On peut décider si on rend "status: ok" même si nomFamille ou prix sont manquants.
  let responseData = {
    status: 'ok',
    type,           // ex. "dom", "tel", "skype"
    prenom,         // ex. "Dominique"
    telephone,      // ex. "+33643268407" ou message d'erreur
    nomFamille,     // ex. "Dupont"
    prix            // ex. "170"
  };

  // 4.6) Vérifier si telephone est "Erreur: Numéro..."
  if (telephone.startsWith('Erreur:')) {
    // On peut transformer le status en 'error'
    responseData.status = 'error';
    responseData.message = telephone;
  }

  // 4.7) Retourner le tout
  return res.json(responseData);
});

/**************************************************
 * 5) Route GET / (test simple)
 **************************************************/
app.get('/', (req, res) => {
  res.send('Hello from my parse server - route /parse to POST your data!');
});

/**************************************************
 * 6) Lancement du serveur
 **************************************************/
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
