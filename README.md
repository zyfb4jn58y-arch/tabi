# Tabi

Tabi (旅, journey) is an offline trip map for two people travelling Japan together. It installs on a phone from the browser and works without internet.

- **Today:** where you're sleeping tonight, what's next with a countdown, and today's spending.
- **Map:** your stays, sights, food, craft spots, walks and travel legs, each with its own shape and colour. You can replay the route with Play the trip.
- **Plan:** the next seven days, with booking and ticket links under each item.
- **Stays:** booked and shortlisted costs, plus the nights still to sort.
- **Spend:** shared expenses in yen or dollars, who paid, and who owes who.
- **Phrases:** Japanese to show staff and taxi drivers, full screen.
- **Notes, to-dos and a stamp book** of everywhere you've been.

## Install on an iPhone

1. Open this site's GitHub Pages address in **Safari** (the address is under Settings, then Pages).
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Open **Tabi** from the home screen. The first screen asks you to import a trip file or set up a new trip.
4. To import, save the trip file to the Files app, then tap **Import a trip file** and choose it.

Do the import inside the home-screen app, not in Safari. iPhones keep the two separate, so a trip imported in Safari won't appear in the app.

## Sharing changes between two phones

Each phone keeps its own copy. To share changes, open **More** and tap **Share trip file**, then send it with AirDrop or Messages. On the other phone, save it to Files and choose **Import a trip file**. For each place, the newer change wins. Expenses and photos from both phones are merged.

## Privacy

This repository holds only the app's code and the base map. Your trip, spending and photos stay on your phone, and in trip files you choose to send.

## Publishing with GitHub Pages

In the repository, go to **Settings**, then **Pages**. Under Build and deployment, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save. The site is ready a minute or two later.

## Credits

Map data: MLIT National Land Numerical Information (administrative areas, simplified by SmartNews Media Research Institute), English prefecture names from dataofjapan/land, Lake Biwa from Natural Earth, and town names from GeoNames (CC BY 4.0). It's built with D3 and TopoJSON. The fonts are Plus Jakarta Sans and Noto Sans JP, both from Google Fonts.
