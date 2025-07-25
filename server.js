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
const { formatPhoneNumber } = require('./phone-utils');

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
      lower.startsWith('skaipe')||
      lower.startsWith('skyp')||
      lower.startsWith('skip')
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

  // 2.2) Extraire le nom de famille (gestion des cas spéciaux : "de", "du", "le", etc.)
const words = withoutPrefixes.split(/\s+/);
let nomFamille = null;

// Vérifie si le premier mot appartient à une structure spécifique
if (words.length > 1) {
  const firstWord = words[0].toLowerCase();
  const secondWord = words[1].toLowerCase();
  const thirdWord = words.length > 2 ? words[2].toLowerCase() : null;

  // Cas : "de", "du", "le", "la" suivi d'un mot
  if (["de", "du", "le", "la"].includes(firstWord)) {
    if (["le", "la", "du", "de"].includes(secondWord) && thirdWord) {
      // Si deuxième mot est aussi un article ou préposition, on inclut le troisième
      nomFamille = `${words[0]} ${words[1]} ${words[2]}`;
    } else {
      // Sinon, on prend les deux premiers mots
      nomFamille = `${words[0]} ${words[1]}`;
    }
  } else {
    // Cas général : pas d'article ou préposition en premier mot
    nomFamille = words[0];
  }
} else if (words.length > 0 && words[0].length > 0) {
  // Si un seul mot, on le prend comme nom de famille
  nomFamille = words[0];
}

  // 2.3) Extraire un prix (nombre + euros/€) ex. "170 euros", "340€", "150", etc.
  // Regex: 
  //   (\d{2,4}) --> 2 à 3 chiffres (ex. 170, 340, 150)
  //   \s*       --> éventuellement des espaces
  //   (?:€|euros)? --> éventuellement le symbole € ou "euros"
  const priceRegex = /(\d{2,4})\s*(?:€|euros)/i;
  const match = withoutPrefixes.match(priceRegex);

  console.log("priceRegex match:", match);
  console.log("withoutPrefixes:", withoutPrefixes);

  
  let prix = null;
  if (match) {
    prix = match[1]; // ex. "170"
  } else {
    // Si aucun prix n'est trouvé,
    // on fixe un "prix" par défaut.
    prix = '170 (à vérifier)';
  }

  return { nomFamille, prix };
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
