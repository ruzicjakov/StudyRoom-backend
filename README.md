# StudyRoom — Backend (mock)

Mock REST API za aplikaciju **StudyRoom** — platformu za pronalazak i rezervaciju
prostora za učenje. Ova verzija koristi podatke u memoriji (bez baze) i služi kao
specifikacija backenda: sve rute vraćaju JSON prema dogovorenom modelu.

## Tehnologije
- Node.js
- Express 5
- CORS

## Pokretanje
```bash
npm install
npm run dev      # razvoj (auto-restart)
# ili
npm start
```
Server se pokreće na `http://localhost:3000`.

## Rute

### Prostori
| Metoda | Ruta | Opis |
|---|---|---|
| GET | `/api/spaces` | Popis prostora (filtri: location, type, minCapacity, search) |
| GET | `/api/spaces/:id` | Detalji prostora |
| GET | `/api/spaces/:id/availability?date=YYYY-MM-DD` | Dostupnost za dan |
| POST | `/api/spaces` | Novi prostor |
| PUT | `/api/spaces/:id` | Izmjena prostora |
| DELETE | `/api/spaces/:id` | Brisanje prostora |

### Rezervacije
| Metoda | Ruta | Opis |
|---|---|---|
| POST | `/api/reservations` | Nova rezervacija (provjera preklapanja termina) |
| GET | `/api/reservations/me` | Rezervacije korisnika |
| DELETE | `/api/reservations/:id` | Otkazivanje rezervacije |

Detaljna specifikacija (request/response JSON) nalazi se u `docs/API-specifikacija.md`.

## Napomena
Podaci su privremeni (u memoriji) i resetiraju se pri svakom restartu servera.
Autentifikacija nije dio ovog opsega.