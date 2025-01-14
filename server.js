const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Pour pouvoir parser du JSON dans le body d'une requête POST
app.use(express.json());

// Route de test
app.get('/', (req, res) => {
  res.send('Hello from my parse server!');
});

// Exemple de route POST pour parser un téléphone
app.post('/parse-phone', (req, res) => {
  const { phoneNumber } = req.body;

  // Ici, tu mets ta fonction existante "formatPhoneNumber" :
  // (exemple simplifié)
  function formatPhoneNumber(phoneNumber) {
    // 1) On nettoie la chaîne (enlève les caractères non numériques)
    var cleaned = phoneNumber.replace(/[^\d]/g, '');
  
    // 2) Vérification Numéro Fixe Français (commençant par 01, 02, 03, 04, 05, 09)
    //    On s'assure qu'il y a exactement 10 chiffres.
    if (/^(01|02|03|04|05|09)\d{8}$/.test(cleaned)) {
      return 'Erreur: Numéro fixe';
    }
  
    // 3) Vérification Numéro Mobile Français (commençant par 06 ou 07)
    //    On s'assure qu'il y a exactement 10 chiffres.
    if (/^(06|07)\d{8}$/.test(cleaned)) {
      // Substring(1) pour enlever le premier '0'
      return '+33' + cleaned.substring(1);
    }
  
    // 4) Vérification Numéro Suisse format "0041" (13 chiffres: 0041 + 9)
    if (/^0041\d{9}$/.test(cleaned)) {
      // Double-check de la longueur pour fournir un message d'erreur spécifique :
      if (cleaned.length !== 13) {
        return 'Erreur: Les numéros suisses avec préfixe "0041" doivent contenir exactement 13 chiffres au total.';
      }
      return '+41' + cleaned.substring(4);
    }
  
    // 5) Vérification Numéro Suisse format "41" (11 chiffres: 41 + 9)
    //    - inclut mobiles suisses : "417..."
    if (/^41\d{9}$/.test(cleaned)) {
      // On vérifie la longueur pour un message précis
      if (cleaned.length !== 11) {
        return 'Erreur: Les numéros suisses avec préfixe "41" doivent contenir exactement 11 chiffres au total.';
      }
      // On enlève "41" => +41
      return '+41' + cleaned.substring(2);
    }
  
    // 6) Vérification Numéro Belge (format "0032" + 7 chiffres = 11)
    if (/^0032\d{7}$/.test(cleaned)) {
      if (cleaned.length !== 11) {
        return 'Erreur: Les numéros belges doivent contenir exactement 11 chiffres au total.';
      }
      return '+32' + cleaned.substring(4);
    }
  
    // 7) Cas par défaut : non reconnu ou mal formaté
    return 'Erreur: Numéro non reconnu ou mal formaté';
  }

  // Exécuter la fonction :
  const result = formatPhoneNumber(phoneNumber || '');
  
  // Renvoyer un JSON :
  res.json({ result });
});

// Lancement du serveur
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});