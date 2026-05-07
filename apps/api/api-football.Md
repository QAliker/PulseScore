# ⚽ Documentation Résumée de l'API Football (API-Sports)

Ce document présente un aperçu synthétique des principaux **endpoints** de l'API, leur **utilité**, les **paramètres clés** et la **fréquence de mise à jour** recommandée.

---

## 🔑 Authentification

Tous les endpoints nécessitent une clé d'API dans le header HTTP.

> **Header** : `x-apisports-key` (obligatoire)

---

## 🌍 Référentiels Généraux

| Endpoint | Description | Mise à Jour | Appels Conseillés |
| :--- | :--- | :--- | :--- |
| `/timezone` | Liste des fuseaux horaires disponibles pour les requêtes. | **Statique** (non mis à jour) | **1 fois** (au besoin) |
| `/countries` | Liste des pays disponibles. Filtrable par `name`, `code`, `search`. | Lors de l'ajout d'un nouveau pays. | **1 par jour** |
| `/leagues` | Liste des ligues/coupes disponibles avec leur couverture de données. Filtrable par `id`, `season`, `country`, etc. | Plusieurs fois par jour. | **1 par heure** |
| `/leagues/seasons` | Liste des saisons disponibles. | Lors de l'ajout d'une nouvelle ligue. | **1 par jour** |

---

## 🏟️ Équipes & Infrastructures

| Endpoint | Description | Mise à Jour | Appels Conseillés |
| :--- | :--- | :--- | :--- |
| `/teams` | Recherche d'équipes par `id`, `name`, `league`/`season`. | Plusieurs fois par semaine. | **1 par jour** |
| `/teams/statistics` | Statistiques d'une équipe sur une saison. **Obligatoire : `league`, `season`, `team`**. | 2 fois par jour. | 1/jour (ou 1/sem. si pas de match) |
| `/venues` | Informations sur les stades. Filtrable par `city`, `country`, etc. | Plusieurs fois par semaine. | **1 par jour** |

---

## 📊 Compétitions & Matchs

| Endpoint | Description | Mise à Jour | Appels Conseillés |
| :--- | :--- | :--- | :--- |
| `/standings` | Classement d'une ligue. **Obligatoire : `season`**. | Toutes les heures. | **1 par heure** (match en cours) / **1 par jour** |
| `/fixtures/rounds` | Journées d'un championnat. **Obligatoire : `league`, `season`**. | Tous les jours. | **1 par jour** |
| `/fixtures` | **Endpoint principal pour les matchs.** Filtrable par `date`, `live`, `ids`, etc. | **Toutes les 15 secondes.** | **1 par minute** (en direct) / **1 par jour** |
| `/fixtures/headtohead` | Confrontations entre deux équipes. **Obligatoire : `h2h` (ex: 33-34)**. | Toutes les 15 secondes. | 1/min. (match en cours) / 1/jour |

---

## 📈 Statistiques de Match

| Endpoint | Description | Mise à Jour | Appels Conseillés |
| :--- | :--- | :--- | :--- |
| `/fixtures/statistics` | Stats d'un match (tirs, possession...). **Obligatoire : `fixture`**. | Toutes les minutes. | **1 par minute** (en direct) / **1 par jour** |
| `/fixtures/events` | Événements d'un match (buts, cartons...). **Obligatoire : `fixture`**. | Toutes les 15 secondes. | **1 par minute** (en direct) / **1 par jour** |
| `/fixtures/lineups` | Compositions d'équipe. **Obligatoire : `fixture`**. | Toutes les 15 minutes. | 1/15min (en direct) / 1/jour |
| `/fixtures/players` | Statistiques individuelles des joueurs pour un match. | Chaque minute. | 1/min (en direct) / 1/jour |

---

## 👥 Joueurs & Staff

| Endpoint | Description | Mise à Jour | Appels Conseillés |
| :--- | :--- | :--- | :--- |
| `/players/profiles` | Profils des joueurs (paginé). | Plusieurs fois/sem. | **1 par semaine** |
| `/players` | Statistiques des joueurs sur une saison. Utiliser `season` + `team`/`league`. | Plusieurs fois/sem. | **1 par jour** |
| `/players/squads` | Effectif actuel d'une équipe ou équipes d'un joueur. | Plusieurs fois/sem. | **1 par semaine** |
| `/players/topscorers` | Top 20 buteurs. **Obligatoire : `league`, `season`**. | Plusieurs fois/sem. | **1 par jour** |
| `/coachs` | Informations et carrière des entraîneurs. | Tous les jours. | **1 par jour** |

---

## ⚕️ Autres Données

| Endpoint | Description | Mise à Jour | Appels Conseillés |
| :--- | :--- | :--- | :--- |
| `/injuries` | Joueurs blessés/suspendus pour un match. | Toutes les 4 heures. | **1 par jour** |
| `/predictions` | Pronostics pour un match. **Obligatoire : `fixture`**. | Toutes les heures. | 1/heure (en direct) / 1/jour |
| `/transfers` | Transferts de joueurs. | Plusieurs fois/sem. | **1 par jour** |
| `/trophies` | Palmarès d'un joueur ou coach. | Plusieurs fois/sem. | **1 par jour** |

---

## 🎲 Cotes (Paris Sportifs)

| Type | Endpoints Clés | Description | Mise à Jour |
| :--- | :--- | :--- | :--- |
| **En Direct** | `/odds/live`, `/odds/live/bets` | Cotes pour les matchs en cours. | ≈ **Toutes les 5 secondes** |
| **Pré-Match** | `/odds`, `/odds/mapping`, `/odds/bookmakers`, `/odds/bets` | Cotes avant le match (1 à 14 jours avant). | **Toutes les 3 heures** |

---

## ⚠️ Codes de Statut HTTP

- **200 OK** : Succès.
- **204 No Content** : Aucun contenu trouvé pour les paramètres.
- **499 Time Out** : La requête a dépassé le temps imparti.
- **500 Internal Server Error** : Erreur interne du serveur.

---

*Résumé créé à partir de la documentation de l'API Sports Football.*