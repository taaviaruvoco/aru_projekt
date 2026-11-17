# ÕpiPlaan

**Vähem stressi, rohkem saavutusi!**

ÕpiPlaan on eestikeelne õppimise planeerija. Ülesanded, seaded ja
fookusstatistika salvestatakse ainult sinu brauseri LocalStorage’isse.
Rakendus ei vaja andmebaasi, Node.js-i ega taustaprotsessi.

## Kasutamine

Laadi kogu projekti sisu veebimajutuse veebijuurkausta (näiteks Zone’i
`public_html`) ja ava `index.html`. Rakendust saab proovida ka otse
`index.html`-i avades tänapäevases brauseris.

Rakendus kasutab JavaScripti ES mooduleid; kui brauser piirab kohaliku faili
avamisel mooduleid, ava rakendus veebimajutuse aadressi kaudu.

## Andmed ja privaatsus

Andmed jäävad kasutatava brauseri ja seadme LocalStorage’isse. Brauseri
andmete kustutamisel või teise seadmega kasutamisel andmed üle ei kandu.
Seadete lehel saab kõik rakenduse andmed kustutada.

## Failid

- `index.html` – rakenduse vaated ja vormid
- `css/style.css` – responsive kujundus ja tume teema
- `js/app.js` – rakenduse olek, navigatsioon ja vaadete sidumine
- `js/tasks.js` – ülesannete kuvamine ja vormi loogika
- `js/calendar.js` – kuu-, nädala- ja päevakalender
- `js/pomodoro.js` – Pomodoro taimer
- `js/storage.js` – LocalStorage’i andmete lugemine ja salvestamine
