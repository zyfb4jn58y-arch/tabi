# Waymark

Waymark (旅, journey) is an offline trip map for two people travelling together. It started as a Japan trip app and now works for 15 countries. It installs on a phone from the browser and works without internet.

- **Today:** where you're sleeping tonight, what's next with a countdown, and today's spending.
- **Map:** a detailed street map in Waymark's colours, with streets, buildings, parks, stations and named places, plus your stays, sights, food, craft spots, walks and travel legs, each with its own shape and colour. Search the map from the bar at the top: it finds your own places first, then towns and sights (Japan's list works offline), then shops, stations and anything else on OpenStreetMap when you're online. Pick a result to fly there and add it to the trip in one tap. You can replay the route with Play the trip. Areas you have looked at keep working offline, and **Save maps for offline** in the ⋯ menu saves the areas around all your places. With no internet and nothing saved, Waymark falls back to its simple map.
- **Plan:** the next seven days, with booking and ticket links under each item.
- **Stays:** booked and shortlisted costs, plus the nights still to sort.
- **Spend:** shared expenses in the local currency or your home money, who paid, and who owes who.
- **Phrases:** the local language to show staff and taxi drivers, full screen. For the UK, the US and New Zealand this becomes **Local words**: the words and customs that differ.
- **Notes, to-dos and a keepsake book** of everywhere you've been: ink stamps in Japan, Korea and Taiwan, postcards in Europe, the UK and Southeast Asia, and embroidered patches in the US and New Zealand.
- **Add to Waymark:** a bookmark for Safari or Brave (or a Share sheet Shortcut) that reads a booking, ticket or place page and copies it. In Waymark, tap **+** then **Paste from a site** and the dates, times, price, booking reference, address and map location are filled in. Booking email text works too. Set it up from `clip.html`.
- **Google Maps lists:** bring in a Saved list, or a list somebody shared with you. Open the list in Safari, tap **Add to Waymark**, then in Waymark tap **+** and **Paste from a site** (or **Notes**, then **Import from Google Maps**). Every place comes in as a maybe, pinned on the map and grouped by city under Notes. A list's `.csv` or `Saved Places.json` from Google Takeout, or a My Maps `.kml`, works too.
- **Where you are:** tap the target button on the map to see your own dot, and **Today** lists your places and maybes nearest to you with walking times. Open a maybe and tap **Plan it for today** to move it onto today's plan.
- **More than one trip, and more than one country:** open **More**, then **Trips and next country**. **Continue to another country** carries the same trip on (your names and home money come with you, and the new country brings its own map, phrases, money and keepsake book). **Start a separate trip** begins from scratch. Every trip stays saved on the phone, and you can open any of them again. A trip file from a different trip is added as its own trip, never mixed in.
- **Keepsake book as a PDF:** open your stamps, postcards or patches and tap **Make a keepsake PDF**. You get a small book of the trip to save, print or send: the route map, your keepsakes, photos, each day and the trip in numbers. It is made on your phone and not sent anywhere.
- **Booking PDFs:** tap **+** then **Import a PDF** and choose a confirmation PDF from Files. Waymark reads the name, dates, check-in and check-out times, price, booking reference, phone and address, and can keep page one with the place as a ticket. It reads PDFs on the phone, offline, with pdf.js.
- **Tickets:** attach ticket screenshots (or a PDF in Safari) to a place and show them full screen on white for scanning, even offline.

## Install on an iPhone

1. Open this site's GitHub Pages address in **Safari** (the address is under Settings, then Pages).
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Open **Waymark** from the home screen. The first screen asks you to import a trip file or set up a new trip.
4. To import, save the trip file to the Files app, then tap **Import a trip file** and choose it.

Do the import inside the home-screen app, not in Safari. iPhones keep the two separate, so a trip imported in Safari won't appear in the app.

## Countries

When you set up a new trip, pick the country. It sets the phrases, the local currency, the local-language name and address fields (for taxis), the keepsake book and where the map starts. Choose your home money too, and Waymark fills in today's exchange rate when you're online (you can type your own).

Japan, South Korea, Taiwan, Thailand, Vietnam, Indonesia, Italy, France, Spain, Portugal, Greece, Germany, the United Kingdom, the United States and New Zealand are included. The country is fixed once a trip has places in it. A trip file carries its country, so the other phone matches.

Japan has an offline place list for search. Elsewhere, searching for a place needs the internet (it uses OpenStreetMap through Photon), and you can always pick a spot on the map instead.

## Sharing changes between two phones

Each phone keeps its own copy. To share changes, open **More** and tap **Share trip file**, then send it with AirDrop or Messages. On the other phone, save it to Files and choose **Import a trip file**. For each place, the newer change wins. Expenses and photos from both phones are merged, and trip settings (dates, names, rate and budget) follow whichever phone changed them last.

## Privacy

This repository holds only the app's code and the base map. Your trip, spending and photos stay on your phone, and in trip files you choose to send. Your location is only used on the phone to draw your dot and measure distances; it is never saved or sent.

## Publishing with GitHub Pages

In the repository, go to **Settings**, then **Pages**. Under Build and deployment, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save. The site is ready a minute or two later.

## Credits

Detailed map: © OpenStreetMap contributors, tiles from OpenFreeMap (OpenMapTiles schema), drawn with MapLibre GL JS (BSD). Place search by Photon (komoot), exchange rates from open.er-api.com, and world outlines from Natural Earth via world-atlas.

Simple map of Japan: MLIT National Land Numerical Information (administrative areas, simplified by SmartNews Media Research Institute), English prefecture names from dataofjapan/land, Lake Biwa from Natural Earth, and town names from GeoNames (CC BY 4.0). It's built with D3, TopoJSON and pdf.js (Mozilla, Apache 2.0). The fonts are Plus Jakarta Sans and the Noto Sans family (Japanese, Korean, Chinese and Thai), all from Google Fonts.
