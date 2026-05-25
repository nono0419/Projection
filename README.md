# Projections F&B · Stade FC Sion

Dashboard de projections financières pour l'offre Food & Beverage du stade.

## Aperçu

- **23 outlets** répartis en 5 catégories (Standards populaires, Saveurs internationales, Identité valaisanne, Bars & boissons, Merchandising)
- **Hypothèses globales éditables** : capacité, remplissage, nombre de matchs, masse salariale, charges fixes, marketing
- **Capture par outlet éditable** : taux de spectateurs consommant à chaque point de vente
- **KPIs en direct** : CA, marge brute, EBITDA, panier moyen
- **Compte de résultat** détaillé
- **Graphiques** : répartition par catégorie, marge par catégorie, top outlets, évolution mensuelle saisonnière
- **Export CSV** des projections

## Stack

HTML / CSS / JavaScript vanilla + [Chart.js](https://www.chartjs.org/) via CDN. Aucun build, déployable directement sur Netlify.

## Lancer en local

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Déploiement Netlify

Glisser/déposer le dossier sur Netlify, ou connecter le dépôt GitHub. Le fichier `netlify.toml` configure les headers de sécurité.

## Structure

```
.
├── index.html       # Page principale
├── styles.css       # Design system
├── data.js          # Données outlets + items + prix
├── app.js           # Modèle de calcul + UI
├── netlify.toml     # Config Netlify
└── README.md
```

## Modèle de calcul

Pour chaque outlet :
- **Panier moyen** = moyenne des prix des items du menu
- **Spectateurs / match** = capacité × taux de remplissage
- **Actes d'achat / match** = spectateurs × taux de capture
- **CA / match** = actes × panier moyen
- **CA saison** = CA / match × nombre de matchs
- **COGS** = CA × ratio coût matière par catégorie (A:30%, B:32%, C:35%, D:22%, Merch:50%)
- **Marge brute** = CA − COGS

P&L global :
- Marge brute totale
- − Masse salariale (% du CA)
- − Marketing (% du CA)
- − Charges fixes (concession, énergie, maintenance)
- = **EBITDA**

Saisonnalité Super League prise en compte (pic septembre-novembre / mars-avril, creux décembre-janvier).
