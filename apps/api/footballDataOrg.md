# Football Data API - Documentation d'utilisation

## Présentation

Cette API REST permet d'accéder à des données footballistiques (compétitions, équipes, matchs, classements, etc.).  
La **version 4** (v4) a été publiée le 20 mai 2022 avec une documentation complète révisée.  
**Il est fortement recommandé de migrer depuis la v2** vers la v4.

## Authentification

Pour utiliser l'API, vous devez inclure votre token d'authentification dans l'en-tête HTTP `X-Auth-Token`.

### Exemple d'en-tête HTTP
X-Auth-Token: YourToken

## URL de base
https://api.football-data.org/v4/


## Compétitions disponibles

| Code | Compétition |
|------|-------------|
| WC | FIFA World Cup |
| CL | UEFA Champions League |
| BL1 | Bundesliga |
| DED | Eredivisie |
| BSA | Campeonato Brasileiro Série A |
| PD | Primera Division |
| FL1 | Ligue 1 |
| ELC | Championship |
| PPL | Primeira Liga |
| EC | European Championship |
| SA | Serie A |
| PL | Premier League |

## Ressources disponibles

### Zones géographiques (Areas)

| Action | URI | Filtres |
|--------|-----|---------|
| Détail d'une zone | `/v4/areas/{id}` | - |
| Liste des zones | `/v4/areas/` | - |

### Compétitions

| Action | URI | Filtres |
|--------|-----|---------|
| Détail d'une compétition | `/v4/competitions/{id}` | - |
| Liste des compétitions | `/v4/competitions/` | `areas` |
| Classement | `/v4/competitions/{id}/standings` | `matchday`, `season`, `date` |
| Matchs d'une compétition | `/v4/competitions/{id}/matches` | `dateFrom`, `dateTo`, `stage`, `status`, `matchday`, `group`, `season` |
| Équipes d'une compétition | `/v4/competitions/{id}/teams` | `season` |
| Meilleurs buteurs | `/v4/competitions/{id}/scorers` | `limit`, `season` |

**Identifiants des compétitions** : `PL` (Premier League), `SA` (Serie A), `BL1` (Bundesliga), `PD` (Primera Division), `FL1` (Ligue 1), `CL` (Champions League), etc.

### Équipes

| Action | URI | Filtres |
|--------|-----|---------|
| Détail d'une équipe | `/v4/teams/{id}` | - |
| Liste des équipes | `/v4/teams/` | `limit`, `offset` |
| Matchs d'une équipe | `/v4/teams/{id}/matches` | `dateFrom`, `dateTo`, `season`, `competitions`, `status`, `venue`, `limit` |

### Personnes (Joueurs/Entraîneurs)

| Action | URI | Filtres |
|--------|-----|---------|
| Détail d'une personne | `/v4/persons/{id}` | - |
| Matchs d'une personne | `/v4/persons/{id}/matches` | `dateFrom`, `dateTo`, `status`, `competitions`, `limit`, `offset` |

### Matchs

| Action | URI | Filtres |
|--------|-----|---------|
| Détail d'un match | `/v4/matches/{id}` | - |
| Liste des matchs | `/v4/matches` | `competitions`, `ids`, `dateFrom`, `dateTo`, `status` |
| Face-à-face | `/v4/matches/{id}/head2head` | `limit`, `dateFrom`, `dateTo`, `competitions` |

## Types de filtres

| Filtre | Type | Description |
|--------|------|-------------|
| `id` | Integer | Identifiant unique |
| `ids` | Integer | Liste d'IDs séparés par des virgules |
| `matchday` | Integer | Journée de championnat |
| `season` | String (yyyy) | Année de début de saison (ex: 2023) |
| `status` | Enum | `SCHEDULED`, `LIVE`, `IN_PLAY`, `PAUSED`, `FINISHED`, `POSTPONED`, `SUSPENDED`, `CANCELLED` |
| `venue` | Enum | `HOME`, `AWAY` |
| `dateFrom`/`dateTo` | String (yyyy-MM-dd) | Période de dates (ex: 2024-01-01) |
| `stage` | Enum | `FINAL`, `SEMI_FINALS`, `QUARTER_FINALS`, `GROUP_STAGE`, `REGULAR_SEASON`, etc. |
| `competitions` | String | IDs de compétitions séparés par des virgules |
| `areas` | String | IDs de zones séparés par des virgules |
| `group` | String | Groupe dans une compétition |
| `limit` | Integer | Nombre max de résultats (défaut: 10) |
| `offset` | Integer | Pagination - nombre d'éléments à ignorer |

## Exemples d'utilisation

### cURL

```bash
# Récupérer la Premier League
curl -X GET "https://api.football-data.org/v4/competitions/PL" \
  -H "X-Auth-Token:"

# Classement de la Premier League (journée 5)
curl -X GET "https://api.football-data.org/v4/competitions/PL/standings?matchday=5" \
  -H "X-Auth-Token:"

# Matchs de la Liga entre deux dates
curl -X GET "https://api.football-data.org/v4/competitions/PD/matches?dateFrom=2024-08-01&dateTo=2024-08-31" \
  -H "X-Auth-Token:"

# Meilleurs buteurs de la Champions League (limité à 10)
curl -X GET "https://api.football-data.org/v4/competitions/CL/scorers?limit=10" \
  -H "X-Auth-Token:"

# Matchs d'une équipe spécifique (ex: id=64 pour Liverpool)
curl -X GET "https://api.football-data.org/v4/teams/64/matches" \
  -H "X-Auth-Token:"

# Tous les matchs du jour
curl -X GET "https://api.football-data.org/v4/matches?dateFrom=2024-01-15&dateTo=2024-01-15" \
  -H "X-Auth-Token:"


  Notes importantes
La v2 reste disponible mais son utilisation n'est plus recommandée

Les identifiants des compétitions sont des chaînes (ex: "PL", "SA") et non des nombres

La pagination par défaut limite les résultats à 10 éléments

Utilisez limit et offset pour paginer les résultats

La plupart des endpoints supportent le filtre season au format année de début

Support
Pour toute question ou problème, référez-vous à la documentation officielle ou contactez le support de football-data.org.

