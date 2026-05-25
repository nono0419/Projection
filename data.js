// Données F&B - Stade FC Sion
// Catégories : A=Standards/Techno, B=Saveurs internationales, C=Identité valaisanne/suisse, D=Bars, Merch=Retail

const CATEGORIES = {
  A: { label: "Standards populaires", color: "#5C8A6C", colorLight: "#E6F0E8" },
  B: { label: "Saveurs internationales", color: "#D4882C", colorLight: "#FBEFD9" },
  C: { label: "Identité valaisanne", color: "#B33A3A", colorLight: "#F5DCDC" },
  D: { label: "Bars & boissons", color: "#2C4960", colorLight: "#D9E2EA" },
  Merch: { label: "Merchandising", color: "#8A6FB5", colorLight: "#E8E0F3" },
};

// Capture par défaut = part des spectateurs qui consomment dans cet outlet sur un match
const CAPTURE_DEFAULT = {
  "merch-01": 0.015,
  "C-05": 0.040, "C-06": 0.025, "C-13": 0.020,
  "B-08": 0.020, "B-15": 0.020, "B-14": 0.020, "B-09": 0.020,
  "B-07": 0.020, "B-04": 0.020, "B-03": 0.020, "B-02": 0.020,
  "A-18": 0.050, "A-19": 0.075, "A-20": 0.050,
  "D-01a": 0.060, "D-01b": 0.050, "D-11": 0.025, "D-10": 0.030,
  "A-16": 0.070, "A-PIZ": 0.060, "A-BUR": 0.070,
  "D-BUV": 0.120,
};

// Panier moyen par défaut pour Merch (pas de prix dans le JSON source)
const PANIER_DEFAULT_MERCH = 28;

const OUTLETS_DATA = {
  "meta": {
    "projet": "Offre F&B Stade FC Sion",
    "devise": "CHF",
  },
  "outlets": [
    { "id": "merch-01", "nom": "La Gamme Goodies Valaisans", "categorie": "Merch", "niveau": "Boutique Niv.1 + Stands F&B", "description": "Gamme signature co-brandée FC Sion, produite en Valais.", "items": [
      {"nom": "Fendant (blanc AOC Valais) - bouteille", "prix": null},
      {"nom": "Petite Arvine premium - bouteille", "prix": null},
      {"nom": "Syrah rouge - bouteille", "prix": null},
      {"nom": "Bière du Valais co-brandée - bouteille", "prix": null},
      {"nom": "Verres collector (gobelet effigie)", "prix": null}
    ]},
    { "id": "C-05", "nom": "La Cave à Raclette", "categorie": "C", "niveau": "REZ - stand vedette", "description": "Raclette et planchette valaisanne, fromage AOP d'alpage.", "items": [
      {"nom": "Assiette Raclette AOP", "prix": 5},
      {"nom": "Assiette Raclette AOP à discrétion", "prix": 35},
      {"nom": "Planchette Valaisanne", "prix": 24},
      {"nom": "Mini Planchette Valaisanne", "prix": 18},
      {"nom": "Croûte au fromage", "prix": 17},
      {"nom": "Sandwich Valaisan", "prix": 11}
    ]},
    { "id": "C-06", "nom": "Le Marché du Jour", "categorie": "C", "niveau": "Rez", "description": "Stand sans menu fixe - un unique plat par mois, produits valaisans du jour.", "items": [
      {"nom": "JAN - Brisolée d'hiver", "prix": 16},
      {"nom": "FÉV - Soupe de courge & croûtons seigle AOP", "prix": 12},
      {"nom": "MAR - Polenta lard d'Orsières & œuf", "prix": 14},
      {"nom": "AVR - Asperges du Valais & jambon cru", "prix": 17},
      {"nom": "MAI - Salade d'herbes & tomme fraîche", "prix": 13},
      {"nom": "JUIN - Filet de féra du Léman grillé", "prix": 19},
      {"nom": "JUIL - Tarte fine abricot du Valais & glace miel", "prix": 11},
      {"nom": "AOÛT - Assiette d'été tomates anciennes & séré", "prix": 13},
      {"nom": "SEPT - Tourte aux champignons des bois", "prix": 15},
      {"nom": "OCT - Civet de cerf, spätzli & chou rouge", "prix": 21},
      {"nom": "NOV - Brisolée d'automne", "prix": 16},
      {"nom": "DÉC - Gratin de pdt fromage d'alpage", "prix": 16}
    ]},
    { "id": "C-13", "nom": "Le Mazot", "categorie": "C", "niveau": "Rez", "description": "Bistrot suisse classique.", "items": [
      {"nom": "Saucisse de veau grillée + salade de pdt", "prix": 16},
      {"nom": "Saucisse de veau grillée + Rösti nature", "prix": 17},
      {"nom": "Rösti nature et œuf", "prix": 12},
      {"nom": "Rösti bacon et fromages romands", "prix": 14},
      {"nom": "Tarte aux fruits de saison", "prix": 7}
    ]},
    { "id": "B-08", "nom": "Greek Taverna", "categorie": "B", "niveau": "Rez", "description": "Cuisine grecque - grill charbon, comptoir mezze.", "items": [
      {"nom": "Souvlaki Plate (3 brochettes)", "prix": 19},
      {"nom": "Moussaka", "prix": 17},
      {"nom": "Spanakopita", "prix": 10},
      {"nom": "Gyros Bowl", "prix": 17},
      {"nom": "Halloumi Fries (végé)", "prix": 13},
      {"nom": "Greek Salad", "prix": 11},
      {"nom": "Loukoumades", "prix": 6}
    ]},
    { "id": "B-15", "nom": "Beirut House", "categorie": "B", "niveau": "Rez", "description": "Cuisine libanaise - broche shawarma, comptoir mezze.", "items": [
      {"nom": "Wrap Shawarma Poulet", "prix": 13},
      {"nom": "Wrap Shawarma Bœuf", "prix": 14},
      {"nom": "Wrap Falafel (végé)", "prix": 12},
      {"nom": "Mezze Box", "prix": 15},
      {"nom": "Manakish Zaatar & Fromage", "prix": 13},
      {"nom": "Baklava trio", "prix": 7}
    ]},
    { "id": "B-14", "nom": "Bangkok Street Food", "categorie": "B", "niveau": "Rez", "description": "Cuisine thaïlandaise - wok visible, néons.", "items": [
      {"nom": "Pad Thaï", "prix": 18},
      {"nom": "Curry Vert ou Rouge", "prix": 19},
      {"nom": "Sauce Satay (brochettes poulet)", "prix": 16},
      {"nom": "Bangkok Fried Rice", "prix": 12},
      {"nom": "4 Rouleaux de printemps", "prix": 17},
      {"nom": "Mango Sticky Rice Cup", "prix": 9}
    ]},
    { "id": "B-09", "nom": "San Sushi", "categorie": "B", "niveau": "Rez", "description": "Bar japonais moderne, rolls signatures, boxes.", "items": [
      {"nom": "Matchday Box 10 pcs", "prix": 18},
      {"nom": "Fire Roll Combo 12 pcs", "prix": 24},
      {"nom": "Stadium Sharing Box 24 pcs", "prix": 42},
      {"nom": "Ocean Premium Box 16 pcs", "prix": 36},
      {"nom": "Express Handroll Pack 3 pcs", "prix": 16},
      {"nom": "Black Edition Box 14 pcs", "prix": 39}
    ]},
    { "id": "B-07", "nom": "Taco Libre", "categorie": "B", "niveau": "Rez", "description": "Tacos mexicains street style - plancha brûlante.", "items": [
      {"nom": "Trio Tacos al Pastor", "prix": 13},
      {"nom": "Trio Tacos Carne Asada", "prix": 14},
      {"nom": "Trio Tacos Veggie", "prix": 12},
      {"nom": "Quesadilla XL fromage & poulet", "prix": 11},
      {"nom": "Nachos Loaded + guacamole", "prix": 10},
      {"nom": "Churros sucre cannelle", "prix": 6}
    ]},
    { "id": "B-04", "nom": "Naan & Nood", "categorie": "B", "niveau": "Rez", "description": "Indien street food - tandoor visible, épices.", "items": [
      {"nom": "Naan Wrap Butter Chicken", "prix": 13},
      {"nom": "Naan Wrap Paneer Tikka (végé)", "prix": 12},
      {"nom": "Naan Wrap Lamb Madras", "prix": 14},
      {"nom": "Bowl Dal & Riz Basmati", "prix": 11},
      {"nom": "Samoussas trio + chutney mangue", "prix": 8},
      {"nom": "Lassi mangue ou rose", "prix": 5}
    ]},
    { "id": "B-03", "nom": "La Pasta Fresca", "categorie": "B", "niveau": "Rez", "description": "Pasta fraîche minute - machine à pâtes visible.", "items": [
      {"nom": "Pasta alla Carbonara", "prix": 16},
      {"nom": "Pasta Cacio e Pepe", "prix": 14},
      {"nom": "Pasta con Pesto alla Genovese", "prix": 14},
      {"nom": "Pasta alla Bolognese", "prix": 16},
      {"nom": "Pasta Tartufo e Funghi", "prix": 18},
      {"nom": "Panna Cotta fruits rouges", "prix": 8}
    ]},
    { "id": "B-02", "nom": "Smokehouse - BBQ Pit", "categorie": "B", "niveau": "Rez", "description": "Smokehouse US style - fumoir visible.", "items": [
      {"nom": "Sandwich porc effiloché + chou", "prix": 14},
      {"nom": "Pain poitrine de bœuf fumée 12h", "prix": 16},
      {"nom": "Ribs de porc + sauce BBQ", "prix": 17},
      {"nom": "Wrap poulet barbecue", "prix": 12},
      {"nom": "Maïs et légumes au gril", "prix": 9}
    ]},
    { "id": "A-18", "nom": "Hot Dog Factory", "categorie": "A", "niveau": "Niv.1", "description": "Hot-dogs d'auteur, garnis minute.", "items": [
      {"nom": "New York Classic", "prix": 8},
      {"nom": "Chicago Style", "prix": 9},
      {"nom": "Chili Cheese Dog", "prix": 10},
      {"nom": "Currywurst Dog", "prix": 9},
      {"nom": "Korean Dog", "prix": 10},
      {"nom": "Frites maison + sauces signature", "prix": 8}
    ]},
    { "id": "A-19", "nom": "Grab & Go", "categorie": "A", "niveau": "Niv.1", "description": "Magasin autonome sans caisse, paiement automatique.", "items": [
      {"nom": "Popcorn salé / caramel", "prix": 5},
      {"nom": "Chocolats valaisans (barre)", "prix": 3},
      {"nom": "Bonbons & confiseries (sachet)", "prix": 4},
      {"nom": "Boissons gazeuses & ice tea", "prix": 5},
      {"nom": "Chips & crackers valaisans", "prix": 4},
      {"nom": "Eaux minérales valaisannes", "prix": 4},
      {"nom": "Nachos avec sauce fromage", "prix": 6},
      {"nom": "Café / boisson chaude", "prix": 5},
      {"nom": "Bretzel nature ou salé", "prix": 4},
      {"nom": "Sandwich froid & wrap", "prix": 8}
    ]},
    { "id": "A-20", "nom": "Coq & Co.", "categorie": "A", "niveau": "Niv.1", "description": "Poulet frit & nuggets craft.", "items": [
      {"nom": "Chicken Bucket 6 pcs + sauce", "prix": 15},
      {"nom": "Chicken Burger Buttermilk", "prix": 13},
      {"nom": "Tenders 4 pcs + sauce maison", "prix": 10},
      {"nom": "Wings 6 pcs", "prix": 11},
      {"nom": "Mini Bucket Kids + frites", "prix": 9}
    ]},
    { "id": "D-01a", "nom": "Porteur de Bière Mobile", "categorie": "D", "niveau": "Tribunes GA", "description": "Vendeur ambulant en tribune avec tireuse dorsale.", "items": [
      {"nom": "Bière pression locale 3dl", "prix": 6},
      {"nom": "Bière pression locale 5dl", "prix": 9},
      {"nom": "Consigne gobelet réutilisable", "prix": 2}
    ]},
    { "id": "D-01b", "nom": "Distributeur de Bière", "categorie": "D", "niveau": "Tribunes GA", "description": "Bar self-service avec contrôle d'âge via app mobile.", "items": [
      {"nom": "Bière pression locale 3dl", "prix": 6},
      {"nom": "Bière pression locale 5dl", "prix": 9},
      {"nom": "Consigne gobelet réutilisable", "prix": 2}
    ]},
    { "id": "D-11", "nom": "Bar Robotique à Cocktails", "categorie": "D", "niveau": "REZ", "description": "Bras robotisés préparant cocktails et mocktails en <90s.", "items": [
      {"nom": "Cocktail signature robot (classique)", "prix": 14},
      {"nom": "Cocktail signature robot (création)", "prix": 18},
      {"nom": "Mocktail sans alcool", "prix": 9}
    ]},
    { "id": "D-10", "nom": "Cervin Cocktail Bar", "categorie": "D", "niveau": "Rez", "description": "Bar à cocktails signature - speakeasy contemporain.", "items": [
      {"nom": "Le Tourbillon (Williamine + abricotine + tonic)", "prix": 16},
      {"nom": "Spritz du Cervin (Petite Arvine + Aperol)", "prix": 14},
      {"nom": "Old Fashioned VS", "prix": 16},
      {"nom": "Classique (Negroni, Aperol, Moscow Mule)", "prix": 14},
      {"nom": "Mocktail Sion Sunset", "prix": 12},
      {"nom": "Mocktail Heida Fresh", "prix": 12}
    ]},
    { "id": "A-16", "nom": "Beer Garden", "categorie": "A", "niveau": "Rez", "description": "Bar à bières valaisannes pression et bouteilles.", "items": [
      {"nom": "Lager 3dl pression", "prix": 6},
      {"nom": "Lager 5dl pression", "prix": 9},
      {"nom": "Pale Ale 3dl", "prix": 7},
      {"nom": "Pale Ale 5dl", "prix": 10},
      {"nom": "Bière Blanche", "prix": 8.5},
      {"nom": "Bière L'Échappée IPA", "prix": 8.5},
      {"nom": "Bière Ambrée de saison", "prix": 9},
      {"nom": "Panaché", "prix": 6},
      {"nom": "Bière sans alcool", "prix": 6}
    ]},
    { "id": "A-PIZ", "nom": "Pizza al Taglio", "categorie": "A", "niveau": "Niv.1", "description": "Pizza romaine en parts.", "items": [
      {"nom": "Margherita (part)", "prix": 7},
      {"nom": "Diavola (part)", "prix": 9},
      {"nom": "Quatre Fromages (part)", "prix": 11},
      {"nom": "Prosciutto di Parma & roquette (part)", "prix": 11},
      {"nom": "Mortadella, pistacchio & burrata (part)", "prix": 14},
      {"nom": "Tiramisu individuel maison", "prix": 8}
    ]},
    { "id": "A-BUR", "nom": "Burger House", "categorie": "A", "niveau": "Niv.1", "description": "Smash burger artisanal, plancha visible.", "items": [
      {"nom": "Smash Burger Classique", "prix": 12},
      {"nom": "Double Smash Burger", "prix": 16},
      {"nom": "Triple Smash Burger", "prix": 19},
      {"nom": "Burger Veggie", "prix": 14},
      {"nom": "Frites maison + sauces", "prix": 8},
      {"nom": "Mini Burger Kids + frites + sirop", "prix": 12}
    ]},
    { "id": "D-BUV", "nom": "Buvette 13 Étoiles", "categorie": "D", "niveau": "Niv.1 - long bar central", "description": "Long bar central FC Sion - bières et vins valaisans.", "items": [
      {"nom": "Lager pression 3dl", "prix": 6},
      {"nom": "Lager pression 5dl", "prix": 9},
      {"nom": "Pale Ale pression 3dl", "prix": 7},
      {"nom": "Pale Ale pression 5dl", "prix": 10},
      {"nom": "Bière Blanche", "prix": 8.5},
      {"nom": "Bière L'Échappée IPA", "prix": 8.5},
      {"nom": "Bière sans alcool", "prix": 6},
      {"nom": "Vin Fendant AOC Valais", "prix": 7},
      {"nom": "Vin Gamay", "prix": 7},
      {"nom": "Vin Petite Arvine AOC Valais", "prix": 9},
      {"nom": "Vin Cornalin AOC Valais", "prix": 9}
    ]},
  ]
};
