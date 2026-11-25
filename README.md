# Center OS – Mobile-Web-App

Das Leitstand-Spiel „Center OS“ aus NLS Intern, optimiert und als installierbare Mobile-Web-App (PWA). Reine statische Dateien, kein Build-Schritt.

## Starten

```bash
python3 -m http.server 8080   # dann http://localhost:8080 öffnen
```

Zum Spielen auf dem Handy die Dateien auf einen beliebigen HTTPS-Webspace legen (z. B. GitHub Pages, Netlify oder unter intern.nextlvlstudios.de/center-os).
- **Android/Chrome:** Unter „Ziele → App installieren“ oder über das Browsermenü.
- **iPhone/Safari:** Auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen.

Nach dem ersten Laden läuft das Spiel auch offline. Ändern sich die Dateien, in `sw.js` die `VERSION` hochzählen.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Aufbau: Kopfzeile, vier Bereiche, Dialoge |
| `styles.css` | Design (NLS: Tinte/Creme, Glas, Hausschrift „Null“), Handy- und Desktop-Layout |
| `app.js` | Spiellogik und Anzeige |
| `manifest.webmanifest`, `sw.js` | PWA: Installation und Offline-Betrieb |
| `assets/` | Icons und Schrift |

## Was gegenüber dem Original anders ist

**Mobile**
- Tab-Leiste unten (Lage · Team · Ziele · Ausbau) mit Hinweisen auf offene Einsätze und kaufbare Ausbauten
- Kompakte Kopfzeile mit Uhrzeit, Kasse, Laune und großen Tempo-Knöpfen
- Zonensteuerung als Bottom-Sheet (schließt per Wischen nach unten), mit Zonenwahl und −/+ fürs Klima
- Größere Tippflächen, Safe-Areas für Notch und Home-Indicator, Querformat, Hell- und Dunkelmodus
- Vibration bei neuen oder eskalierenden Einsätzen und bei Feueralarm (abschaltbar)
- Pausiert automatisch und speichert, sobald die App in den Hintergrund geht
- Kurzanleitung beim ersten Start, eigene Bestätigungsdialoge statt `confirm()`

**Leistung**
- Die DOM-Elemente für Einsätze, Pins, Personal und Shop werden nicht mehr bei jedem Takt neu gebaut, sondern nur noch aktualisiert. Dadurch gehen Antipper nicht mehr verloren, weil ein Knopf unter dem Finger ersetzt wurde.
- Ins DOM wird nur geschrieben, wenn sich ein Wert geändert hat.
- Statischer Hintergrund statt animierter Blur-Kreise, weniger `backdrop-filter`
- Gäste-Punkte bewegen sich per `transform` und nur, wenn die Karte sichtbar ist.
- Diagramme werden nur gezeichnet, wenn sie sichtbar sind.

**Fehler behoben**
- Ein Neuladen nach Ladenschluss konnte den Tag doppelt werten (XP und Rekord). Der Tagesbericht wird jetzt im Spielstand gespeichert.
- Ein offener Feueralarm ging beim Neuladen verloren. Er wird jetzt wiederhergestellt.
- Die Brandprüfung zählte als „Einsatz erledigt“ (+XP), und ein zweites Antippen startete die Prüfung neu.
- Bei Prüfung ohne freie Technik wurde trotzdem eine Technikerin belegt.
- Autos im Parkhaus zählten als Besucher und Umsatz. Zum Ausgleich ist der Umsatz pro Gast leicht angehoben.
- Die Zufriedenheit konnte unter 0 fallen.
- Aufgaben werden jetzt gleichmäßig ausgelost (Fisher-Yates statt `sort(random)`).

**Komfort**
- Optional läuft die Zeit außerhalb der Öffnungszeit (vor 9 und nach 20 Uhr) 3× so schnell.
- Ältere Spielstände (`nls-center-os-v2`) werden übernommen und ergänzt.
